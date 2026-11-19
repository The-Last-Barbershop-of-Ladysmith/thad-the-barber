using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// What Twilio tells us after a text goes out. A customer's reply (STOP, START) updates the news-texts list: Twilio
/// itself already blocks and answers STOP and HELP for the shop's number (Advanced Opt-Out, with the help text set in its
/// console), so this only keeps our list in step. A delivery report goes into the month's log and, when a text
/// couldn't be delivered, into telemetry as a warning with Twilio's error code and never the phone, so an alert can see it.
/// </summary>
public sealed partial class TwilioWebhookService(
    TwilioSignatureValidator signatures,
    MarketingOptInService optIns,
    TextLog log,
    ILogger<TwilioWebhookService> logger)
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
    };

    private static readonly HashSet<string> StartWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "START", "YES", "UNSTOP",
    };

    private static readonly HashSet<string> FinalStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "delivered", "undelivered", "failed",
    };

    public async Task HandleIncomingAsync(string path, IReadOnlyDictionary<string, string> form, string? signature, CancellationToken cancellationToken)
    {
        signatures.EnsureValid(path, form, signature);
        string phone = form.GetValueOrDefault("From", string.Empty);
        if (phone.Length == 0)
        {
            return;
        }

        switch (ReadReply(form))
        {
            case TwilioReply.Stop:
                await optIns.OptOutAsync(phone, cancellationToken);
                LogReply(logger, "stop");
                break;
            case TwilioReply.Start:
                bool isListedAgain = await optIns.OptInAgainAsync(phone, cancellationToken);
                LogReply(logger, isListedAgain ? "start" : "start-ignored");
                break;
        }
    }

    public async Task HandleStatusAsync(string path, IReadOnlyDictionary<string, string> form, string? signature, CancellationToken cancellationToken)
    {
        signatures.EnsureValid(path, form, signature);
        string status = form.GetValueOrDefault("MessageStatus", string.Empty);
        string sid = form.GetValueOrDefault("MessageSid", string.Empty);
        if (sid.Length == 0 || !FinalStatuses.Contains(status))
        {
            return;
        }

        string errorCode = form.GetValueOrDefault("ErrorCode", string.Empty);
        string recorded = errorCode.Length > 0 ? $"{status}-{errorCode}" : status;
        await log.RecordAsync(TextKind.Delivery, sid, sid, recorded, cancellationToken);
        if (!status.Equals("delivered", StringComparison.OrdinalIgnoreCase))
        {
            LogNotDelivered(logger, status, errorCode);
        }

        if (errorCode == TextMessageSender.RecipientOptedOutErrorCode.ToString(System.Globalization.CultureInfo.InvariantCulture)
            && form.GetValueOrDefault("To", string.Empty) is { Length: > 0 } recipient)
        {
            await optIns.OptOutAsync(recipient, cancellationToken);
        }
    }

    /// <summary>Twilio names the keyword it acted on in <c>OptOutType</c> when Advanced Opt-Out is on; otherwise the body's own word counts.</summary>
    internal static TwilioReply ReadReply(IReadOnlyDictionary<string, string> form)
    {
        string optOutType = form.GetValueOrDefault("OptOutType", string.Empty).Trim();
        string keyword = optOutType.Length > 0 ? optOutType : form.GetValueOrDefault("Body", string.Empty).Trim();
        if (StopWords.Contains(keyword))
        {
            return TwilioReply.Stop;
        }

        if (StartWords.Contains(keyword))
        {
            return TwilioReply.Start;
        }

        return keyword.Equals("HELP", StringComparison.OrdinalIgnoreCase) ? TwilioReply.Help : TwilioReply.None;
    }

    [LoggerMessage(EventName = "TwilioReply", Level = LogLevel.Information, Message = "A customer replied {Reply} to the shop's number.")]
    private static partial void LogReply(ILogger logger, string reply);

    [LoggerMessage(EventName = "TextNotDelivered", Level = LogLevel.Warning, Message = "A text was {Status} (Twilio error code {ErrorCode}).")]
    private static partial void LogNotDelivered(ILogger logger, string status, string errorCode);
}
