using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Announcements.Services;
using ThadTheBarber.Api.Features.Gallery.Mappers;
using ThadTheBarber.Api.Features.Gallery.Services;
using ThadTheBarber.Api.Features.Media.Configuration;
using ThadTheBarber.Api.Features.Media.Exceptions;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;

namespace ThadTheBarber.Api.Features.Media.Services;

/// <summary>
/// Event Grid's notifications about the storage account: a photo added to or removed from <c>gallery/</c>, or
/// <c>announcements.json</c> written or deleted, marks that cached copy stale so the next read lists it again instead of
/// waiting out the cache time. Every call must carry the subscription's secret header, which also covers Event Grid's
/// subscription handshake.
/// </summary>
public sealed partial class MediaWebhookService(
    GalleryService gallery,
    AnnouncementsService announcements,
    IOptions<MediaStorageSettings> storage,
    IOptions<MediaWebhookSettings> settings,
    ILogger<MediaWebhookService> logger)
{
    private const string ValidationEventType = "Microsoft.EventGrid.SubscriptionValidationEvent";
    private const string BlobCreatedEventType = "Microsoft.Storage.BlobCreated";
    private const string BlobDeletedEventType = "Microsoft.Storage.BlobDeleted";
    private const string ContainerSubjectPrefix = "/blobServices/default/containers/";
    private const string BlobSubjectSeparator = "/blobs/";

    /// <summary>
    /// Handles one delivery. Returns the code to echo when it's Event Grid's subscription handshake, otherwise null.
    /// Throws <see cref="InvalidMediaWebhookKeyException"/>, changing nothing, unless <paramref name="key"/> is the
    /// subscription's secret, and <see cref="InvalidMediaWebhookBodyException"/> for a body that isn't an array of events.
    /// </summary>
    public string? Handle(string body, string? key)
    {
        VerifyKey(key);
        try
        {
            using JsonDocument deliveredEvents = JsonDocument.Parse(body);
            if (deliveredEvents.RootElement.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidMediaWebhookBodyException(null);
            }

            string? validationCode = null;
            foreach (JsonElement deliveredEvent in deliveredEvents.RootElement.EnumerateArray())
            {
                validationCode ??= ReadValidationCode(deliveredEvent);
                HandleBlobChange(deliveredEvent);
            }

            return validationCode;
        }
        catch (JsonException exception)
        {
            throw new InvalidMediaWebhookBodyException(exception);
        }
    }

    private void VerifyKey(string? key)
    {
        string? expected = settings.Value.Key;
        if (string.IsNullOrEmpty(expected)
            || key is null
            || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(expected)))
        {
            throw new InvalidMediaWebhookKeyException();
        }
    }

    private static string? ReadValidationCode(JsonElement deliveredEvent)
    {
        if (Text(deliveredEvent, "eventType") != ValidationEventType
            || !deliveredEvent.TryGetProperty("data", out JsonElement data)
            || data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return Text(data, "validationCode");
    }

    private void HandleBlobChange(JsonElement deliveredEvent)
    {
        string? eventType = Text(deliveredEvent, "eventType");
        string? subject = Text(deliveredEvent, "subject");
        if (eventType is not (BlobCreatedEventType or BlobDeletedEventType)
            || subject is null
            || !subject.StartsWith(ContainerSubjectPrefix, StringComparison.Ordinal))
        {
            return;
        }

        string containerAndBlob = subject[ContainerSubjectPrefix.Length..];
        int separator = containerAndBlob.IndexOf(BlobSubjectSeparator, StringComparison.Ordinal);
        if (separator < 0)
        {
            return;
        }

        string container = containerAndBlob[..separator];
        string blobName = containerAndBlob[(separator + BlobSubjectSeparator.Length)..];
        MediaStorageSettings media = storage.Value;
        if (container == media.MediaContainerName && blobName.StartsWith(GalleryMapper.FolderPrefix, StringComparison.Ordinal))
        {
            gallery.MarkStale();
            LogMarkedStale(logger, "gallery", eventType);
        }
        else if (container == media.ContentContainerName && blobName == AnnouncementsService.FileName)
        {
            announcements.MarkStale();
            LogMarkedStale(logger, "announcements", eventType);
        }
    }

    private static string? Text(JsonElement parent, string name)
    {
        if (parent.ValueKind != JsonValueKind.Object
            || !parent.TryGetProperty(name, out JsonElement value)
            || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return value.GetString();
    }

    [LoggerMessage(EventName = "MediaWebhookMarkedStale", Level = LogLevel.Information, Message = "Media webhook {EventType}: the {Cache} copy is marked stale.")]
    private static partial void LogMarkedStale(ILogger logger, string cache, string eventType);
}
