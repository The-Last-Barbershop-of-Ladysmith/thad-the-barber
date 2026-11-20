using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// Keeps one reminder job per booking and sends the ones that are due. A job is made when the booking is, unless the
/// booking starts sooner than <see cref="TextMessagesSettings.ReminderLead"/> away (its confirmation is the reminder).
/// A run reads only the days a reminder can fall in. It takes a job with an ETag write (Pending to Claimed) before it
/// texts, so two runs, or two instances, never send the same one; if Twilio refused the text the job goes back to
/// Pending for the next run, and if Twilio didn't answer it stays Claimed, since the text may have gone.
/// </summary>
public sealed partial class ReminderService(
    ISquareService square,
    IMediaStorage storage,
    IOptions<MediaStorageSettings> storageSettings,
    IOptions<TextMessagesSettings> settings,
    ManageTokenSigner manageTokens,
    TextMessageSender sender,
    TimeProvider time,
    ILogger<ReminderService> logger)
{
    /// <summary>A reminder falls within its lead of the start, so the start is at most this many local days ahead.</summary>
    private const int DaysAhead = 2;

    public async Task ScheduleAsync(Appointment appointment, string phone, CancellationToken cancellationToken)
    {
        if (appointment.StartAt - time.GetUtcNow() < settings.Value.ReminderLead)
        {
            return;
        }

        TimeZoneInfo zone = await GetShopZoneAsync(cancellationToken);
        ReminderJob job = new(
            appointment.Id,
            phone,
            appointment.StartAt,
            ReminderState.Pending,
            null,
            null
        );
        await storage.WriteTextAsync(
            storageSettings.Value.ContentContainerName,
            TextBlobNames.Reminder(zone.ToLocalDate(appointment.StartAt), appointment.Id),
            TextJson.Write(job),
            cancellationToken
        );
    }

    /// <summary>The phone the booking's reminder was set for, or null when it had none (it was made too close to its start).</summary>
    public async Task<string?> FindPhoneAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        TimeZoneInfo zone = await GetShopZoneAsync(cancellationToken);
        string? text = await storage.ReadTextAsync(
            storageSettings.Value.ContentContainerName,
            TextBlobNames.Reminder(zone.ToLocalDate(appointment.StartAt), appointment.Id),
            cancellationToken
        );

        return text is null ? null : TextJson.Read<ReminderJob>(text).Phone;
    }

    public async Task CancelAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        TimeZoneInfo zone = await GetShopZoneAsync(cancellationToken);
        await storage.DeleteAsync(
            storageSettings.Value.ContentContainerName,
            TextBlobNames.Reminder(zone.ToLocalDate(appointment.StartAt), appointment.Id),
            cancellationToken
        );
    }

    /// <summary>Sends every reminder that is due now; returns how many were sent.</summary>
    public async Task<int> RunAsync(CancellationToken cancellationToken)
    {
        TimeZoneInfo zone = await GetShopZoneAsync(cancellationToken);
        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        string container = storageSettings.Value.ContentContainerName;
        DateTimeOffset now = time.GetUtcNow();
        DateOnly today = zone.ToLocalDate(now);
        int sentCount = 0;
        for (int dayOffset = 0; dayOffset <= DaysAhead; dayOffset++)
        {
            List<StoredBlob> jobs = await storage.ListAsync(container, TextBlobNames.ReminderDayPrefix(today.AddDays(dayOffset)), cancellationToken);
            foreach (StoredBlob blob in jobs)
            {
                if (await TrySendReminderAsync(container, blob.Name, shop, zone, now, cancellationToken))
                {
                    sentCount++;
                }
            }
        }

        return sentCount;
    }

    private async Task<bool> TrySendReminderAsync(
        string container,
        string blobName,
        ShopDetails shop,
        TimeZoneInfo zone,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
        if (stored is null)
        {
            return false;
        }

        ReminderJob job = TextJson.Read<ReminderJob>(stored.Text);
        TimeSpan untilStart = job.StartAt - now;
        if (job.State != ReminderState.Pending || untilStart > settings.Value.ReminderLead)
        {
            return false;
        }

        if (untilStart < settings.Value.ReminderMinimumNotice)
        {
            await storage.TryReplaceTextAsync(container, blobName, TextJson.Write(job with { State = ReminderState.Skipped, FinishedAt = now }), stored.ETag, cancellationToken);
            return false;
        }

        ReminderJob claimed = job with { State = ReminderState.Claimed };
        if (!await storage.TryReplaceTextAsync(container, blobName, TextJson.Write(claimed), stored.ETag, cancellationToken))
        {
            return false;
        }

        string body = BookingTextMessages.Reminder(shop.Name, zone, job.StartAt, ManageLink(job.BookingId));
        SendAttempt attempt = await sender.TrySendAsync(TextKind.Reminder, job.BookingId, job.Phone, body, cancellationToken);
        ReminderJob? finished = attempt.Outcome switch
        {
            SendOutcome.Sent => claimed with { State = ReminderState.Sent, FinishedAt = time.GetUtcNow(), MessageSid = attempt.MessageSid },
            SendOutcome.OptedOut => claimed with { State = ReminderState.Skipped, FinishedAt = time.GetUtcNow() },
            SendOutcome.Failed or SendOutcome.Disabled => job,
            _ => null,
        };
        if (finished is not null)
        {
            await ReplaceAfterClaimAsync(container, blobName, finished, cancellationToken);
        }

        return attempt.Outcome == SendOutcome.Sent;
    }

    private async Task ReplaceAfterClaimAsync(string container, string blobName, ReminderJob finished, CancellationToken cancellationToken)
    {
        try
        {
            StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
            if (stored is not null)
            {
                await storage.TryReplaceTextAsync(container, blobName, TextJson.Write(finished), stored.ETag, cancellationToken);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogJobNotUpdated(logger, exception, finished.State);
        }
    }

    public string ManageLink(string bookingId) =>
        $"{settings.Value.SiteUrl.TrimEnd('/')}/book/manage/{Uri.EscapeDataString(bookingId)}#t={manageTokens.Sign(bookingId)}";

    private async Task<TimeZoneInfo> GetShopZoneAsync(CancellationToken cancellationToken)
    {
        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        return TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone);
    }

    [LoggerMessage(EventName = "ReminderNotUpdated", Level = LogLevel.Warning, Message = "A reminder's job couldn't be moved to {State} after its text was handled.")]
    private static partial void LogJobNotUpdated(ILogger logger, Exception exception, ReminderState state);
}
