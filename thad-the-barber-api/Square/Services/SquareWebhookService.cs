using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Square;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// Square's change notifications: each marks the cached copy of what changed stale, so the next read refetches it
/// instead of waiting out <see cref="SquareCache.CacheFor"/>. Square retries a notification for up to 24 hours, so an
/// event id is remembered that long and a repeat is skipped.
/// </summary>
public sealed partial class SquareWebhookService(
    SquareCache squareCache,
    IMemoryCache cache,
    IOptions<SquareSettings> settings,
    ILogger<SquareWebhookService> logger)
{
    private const string LocationUpdated = "location.updated";
    private const string CatalogVersionUpdated = "catalog.version.updated";
    private const string HandledEventKeyPrefix = "square:webhook-event:";
    private static readonly TimeSpan rememberEventsFor = TimeSpan.FromHours(24);

    /// <summary>Throws <see cref="InvalidWebhookSignatureException"/>, changing nothing, unless Square signed <paramref name="body"/>.</summary>
    public void Handle(string body, string? signature)
    {
        SquareSettings squareSettings = settings.Value;
        if (signature is null
            || !WebhooksHelper.VerifySignature(
                body,
                signature,
                squareSettings.WebhookSignatureKey,
                squareSettings.WebhookNotificationUrl.OriginalString))
        {
            throw new InvalidWebhookSignatureException();
        }

        SquareWebhookEvent webhookEvent = JsonSerializer.Deserialize<SquareWebhookEvent>(body)
            ?? throw new JsonException("The Square webhook body is null.");
        string handledEventKey = HandledEventKeyPrefix + webhookEvent.EventId;
        if (cache.TryGetValue(handledEventKey, out _))
        {
            LogRepeat(logger, webhookEvent.Type, webhookEvent.EventId);
            return;
        }

        cache.Set(handledEventKey, true, rememberEventsFor);
        switch (webhookEvent.Type)
        {
            case LocationUpdated:
                squareCache.MarkStale<ShopDetails>(SquareService.ShopDetailsKey);
                break;
            case CatalogVersionUpdated:
                squareCache.MarkStale<List<BookableService>>(SquareService.BookableServicesKey);
                break;
        }

        LogReceived(logger, webhookEvent.Type, webhookEvent.EventId);
    }

    [LoggerMessage(EventName = "SquareWebhookReceived", Level = LogLevel.Information, Message = "Square webhook {EventType} {EventId} received.")]
    private static partial void LogReceived(ILogger logger, string eventType, string eventId);

    [LoggerMessage(EventName = "SquareWebhookRepeat", Level = LogLevel.Information, Message = "Square webhook {EventType} {EventId} was already handled, so it's skipped.")]
    private static partial void LogRepeat(ILogger logger, string eventType, string eventId);
}
