using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Contact.Exceptions;
using ThadTheBarber.Api.Features.Contact.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Contact.Services;

/// <summary>
/// Saves each message as its own file, <c>contact/{time}-{id}.json</c> in the private content container, so
/// simultaneous messages can't overwrite each other. A question or an issue also logs <c>ContactNeedsReply</c>, which
/// the Bicep alert watches; it carries the category and the file name only, since the contact details stay in the file
/// and out of telemetry.
/// </summary>
public sealed partial class ContactService(
    IMediaStorage storage,
    IOptions<MediaStorageSettings> settings,
    TimeProvider time,
    ILogger<ContactService> logger)
{
    public const string Folder = "contact/";

    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    public async Task<ContactReceipt> SendAsync(ContactRequest request, CancellationToken cancellationToken)
    {
        ContactMessage message = new(
            Guid.NewGuid(),
            time.GetUtcNow(),
            request.Category,
            request.Message.Trim(),
            request.Name?.Trim(),
            request.Email?.Trim(),
            request.Phone,
            request.PageOrBooking?.Trim()
        );
        string fileName = $"{Folder}{message.ReceivedAt.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture)}-{message.Id:N}.json";
        try
        {
            await storage.WriteNewTextAsync(
                settings.Value.ContentContainerName,
                fileName,
                JsonSerializer.Serialize(message, FileOptions),
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new ContactUnavailableException(exception);
        }

        if (message.Category is not ContactCategory.Feedback)
        {
            LogNeedsReply(message.Category, fileName);
        }

        return new ContactReceipt(message.Id);
    }

    [LoggerMessage(EventName = "ContactNeedsReply", Level = LogLevel.Information, Message = "A {Category} needs a reply: {FileName}.")]
    private partial void LogNeedsReply(ContactCategory category, string fileName);
}
