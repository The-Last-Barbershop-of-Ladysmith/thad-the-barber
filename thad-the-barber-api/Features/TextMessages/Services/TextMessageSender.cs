using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Twilio.Exceptions;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// The one place that texts a phone. <see cref="TrySendAsync"/> sends and sorts every way it can end into a
/// <see cref="SendOutcome"/>, so no caller handles Twilio's exceptions; <see cref="SendOnceAsync"/> adds a marker blob
/// made only if it doesn't exist (an atomic claim), so a retried booking or a second instance can't text the same
/// thing twice. The claim comes first and is given back only when Twilio refused the text; when Twilio didn't answer,
/// the text may have gone, so the claim stays and nothing is sent again (a stuck marker is the alert's cue).
/// </summary>
public sealed partial class TextMessageSender(
    ITwilioMessageService twilio,
    IMediaStorage storage,
    IOptions<MediaStorageSettings> storageSettings,
    IOptions<TextMessagesSettings> settings,
    MarketingOptInService optIns,
    TextLog log,
    TimeProvider time,
    ILogger<TextMessageSender> logger)
{
    /// <summary>Twilio's error for a phone that replied STOP to the sender.</summary>
    public const int RecipientOptedOutErrorCode = 21610;

    public bool IsEnabled => settings.Value.IsEnabled;

    public async Task<SendAttempt> TrySendAsync(TextKind kind, string reference, string phone, string body, CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return new SendAttempt(SendOutcome.Disabled, null);
        }

        try
        {
            string sid = await twilio.SendAsync(phone, body, cancellationToken);
            await log.RecordAsync(kind, reference, sid, "sent", cancellationToken);
            return new SendAttempt(SendOutcome.Sent, sid);
        }
        catch (TwilioNotConfiguredException)
        {
            LogNotConfigured(logger, kind);
            return new SendAttempt(SendOutcome.Disabled, null);
        }
        catch (TwilioRequestFailedException exception) when (exception.TwilioErrorCode == RecipientOptedOutErrorCode)
        {
            await optIns.OptOutAsync(phone, cancellationToken);
            await log.RecordAsync(kind, reference, null, "recipient-opted-out", cancellationToken);
            return new SendAttempt(SendOutcome.OptedOut, null);
        }
        catch (TwilioRequestFailedException exception) when (exception.StatusCode > 0)
        {
            LogRefused(logger, kind, exception.StatusCode, exception.TwilioErrorCode);
            await log.RecordAsync(kind, reference, null, $"refused-{exception.TwilioErrorCode}", cancellationToken);
            return new SendAttempt(SendOutcome.Failed, null);
        }
        catch (TwilioRequestFailedException)
        {
            LogUnreachable(logger, kind);
            await log.RecordAsync(kind, reference, null, "unreachable", cancellationToken);
            return new SendAttempt(SendOutcome.Uncertain, null);
        }
    }

    /// <summary>Texts once for <paramref name="markerName"/>; null when something else already claimed it, so the caller does nothing more.</summary>
    public async Task<SendAttempt?> SendOnceAsync(
        TextKind kind,
        string markerName,
        string reference,
        string phone,
        string body,
        CancellationToken cancellationToken)
    {
        if (!IsEnabled)
        {
            return new SendAttempt(SendOutcome.Disabled, null);
        }

        string container = storageSettings.Value.ContentContainerName;
        SendMarker claimed = new(
            SendMarkerState.Claimed,
            time.GetUtcNow(),
            null,
            null
        );
        if (!await storage.TryWriteNewTextAsync(container, markerName, JsonSerializer.Serialize(claimed, TextJson.Options), cancellationToken))
        {
            return null;
        }

        SendAttempt attempt = await TrySendAsync(kind, reference, phone, body, cancellationToken);
        switch (attempt.Outcome)
        {
            case SendOutcome.Failed or SendOutcome.Disabled:
                await storage.DeleteAsync(container, markerName, cancellationToken);
                break;
            case SendOutcome.Sent:
                await FinishAsync(container, markerName, claimed with { State = SendMarkerState.Sent, FinishedAt = time.GetUtcNow(), MessageSid = attempt.MessageSid }, cancellationToken);
                break;
            case SendOutcome.OptedOut:
                await FinishAsync(container, markerName, claimed with { State = SendMarkerState.Refused, FinishedAt = time.GetUtcNow() }, cancellationToken);
                break;
        }

        return attempt;
    }

    private async Task FinishAsync(string container, string markerName, SendMarker finished, CancellationToken cancellationToken)
    {
        try
        {
            StoredText? stored = await storage.ReadTextWithETagAsync(container, markerName, cancellationToken);
            if (stored is not null)
            {
                await storage.TryReplaceTextAsync(container, markerName, JsonSerializer.Serialize(finished, TextJson.Options), stored.ETag, cancellationToken);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogMarkerNotFinished(logger, exception);
        }
    }

    [LoggerMessage(EventName = "TextNotConfigured", Level = LogLevel.Warning, Message = "A {Kind} text wasn't sent: Twilio has no Messaging Service or sender number.")]
    private static partial void LogNotConfigured(ILogger logger, TextKind kind);

    [LoggerMessage(EventName = "TextRefused", Level = LogLevel.Warning, Message = "Twilio refused a {Kind} text: status {Status}, error code {ErrorCode}.")]
    private static partial void LogRefused(ILogger logger, TextKind kind, int status, int? errorCode);

    [LoggerMessage(EventName = "TextUnreachable", Level = LogLevel.Error, Message = "Twilio didn't answer a {Kind} text; it may have been sent and will not be tried again.")]
    private static partial void LogUnreachable(ILogger logger, TextKind kind);

    [LoggerMessage(EventName = "TextMarkerNotFinished", Level = LogLevel.Warning, Message = "A sent text's marker couldn't be marked sent.")]
    private static partial void LogMarkerNotFinished(ILogger logger, Exception exception);
}
