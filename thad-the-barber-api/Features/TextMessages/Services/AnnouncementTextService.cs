using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Features.TextMessages.Exceptions;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// Texts an announcement to everyone who opted in, once. Requesting it writes the announcement's send record, which only
/// one request can create (an atomic blob write), so a second request, a double click or a retry gets 409 and nobody is
/// texted twice. The record is frozen with the message and waits for the announcement's first day when that is ahead.
/// The sending itself is the background worker's: it takes the record with an ETag write, texts the subscribers one by
/// one, and saves its progress after each, so a send that stops (a restart, a crash) is picked up after ten minutes
/// and carries on with the people not yet texted.
/// </summary>
public sealed partial class AnnouncementTextService(
    ISquareService square,
    MarketingOptInService optIns,
    TextMessageSender sender,
    AnnouncementTextSignal signal,
    IMediaStorage storage,
    IOptions<MediaStorageSettings> storageSettings,
    IOptions<TextMessagesSettings> settings,
    TimeProvider time,
    ILogger<AnnouncementTextService> logger)
{
    /// <summary>A send that has saved no progress for this long is taken to have stopped, and the next run takes it over.</summary>
    public static readonly TimeSpan StaleAfter = TimeSpan.FromMinutes(10);

    private const string Prefix = "announcement-sends/";

    public async Task<AnnouncementTextPreview> PreviewAsync(AnnouncementTextPreviewRequest request, CancellationToken cancellationToken)
    {
        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone);
        string id = AnnouncementTextComposer.SendId(request.StartDate, request.Title);
        AnnouncementSend? existing = (await ReadAsync(id, cancellationToken))?.Send;
        return new AnnouncementTextPreview(
            AnnouncementTextComposer.Compose(shop.Name, request.Title, request.BodyHtml, settings.Value.SiteUrl),
            (await optIns.ListActiveAsync(cancellationToken)).Count,
            settings.Value.IsEnabled,
            request.StartDate > zone.ToLocalDate(time.GetUtcNow()),
            existing is null ? null : ToStatus(existing)
        );
    }

    public async Task<AnnouncementTextStatus> RequestAsync(AnnouncementTextRequest request, CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            throw new TextsUnavailableException("Texting is switched off in this environment.");
        }

        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone);
        DateTimeOffset now = time.GetUtcNow();
        DateOnly today = zone.ToLocalDate(now);
        string id = AnnouncementTextComposer.SendId(request.StartDate, request.Title);
        AnnouncementSend send = new(
            id,
            AnnouncementTextComposer.EnsureOptOutNotice(request.Message),
            request.StartDate > today ? request.StartDate : today,
            request.StartDate > today ? AnnouncementSendState.Scheduled : AnnouncementSendState.Queued,
            now,
            null,
            null,
            (await optIns.ListActiveAsync(cancellationToken)).Count,
            0,
            0,
            []
        );
        bool isCreated;
        try
        {
            isCreated = await storage.TryWriteNewTextAsync(storageSettings.Value.ContentContainerName, BlobName(id), Serialize(send), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new TextsUnavailableException("The announcement's text couldn't be saved.", exception);
        }

        if (!isCreated)
        {
            throw new AnnouncementAlreadyTextedException(id);
        }

        signal.Notify();
        return ToStatus(send);
    }

    public async Task<AnnouncementTextStatus?> GetStatusAsync(string id, CancellationToken cancellationToken)
    {
        AnnouncementSend? send = (await ReadAsync(id, cancellationToken))?.Send;
        return send is null ? null : ToStatus(send);
    }

    /// <summary>Takes up every send that is due (queued, its day come, or stopped midway) and texts it through; returns how many it finished.</summary>
    public async Task<int> ProcessDueAsync(CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            return 0;
        }

        int finished = 0;
        List<StoredBlob> sends = await storage.ListAsync(storageSettings.Value.ContentContainerName, Prefix, cancellationToken);
        foreach (StoredBlob blob in sends)
        {
            if (await ProcessAsync(blob.Name, cancellationToken))
            {
                finished++;
            }
        }

        return finished;
    }

    private async Task<bool> ProcessAsync(string blobName, CancellationToken cancellationToken)
    {
        string container = storageSettings.Value.ContentContainerName;
        StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
        if (stored is null)
        {
            return false;
        }

        AnnouncementSend send = Read(stored.Text);
        DateTimeOffset now = time.GetUtcNow();
        if (!await IsDueAsync(send, now, cancellationToken))
        {
            return false;
        }

        List<MarketingOptIn> recipients = await optIns.ListActiveAsync(cancellationToken);
        AnnouncementSend current = send with
        {
            State = AnnouncementSendState.Sending,
            ClaimedAt = now,
            Total = Math.Max(send.Total, recipients.Count),
        };
        if (!await storage.TryReplaceTextAsync(container, blobName, Serialize(current), stored.ETag, cancellationToken))
        {
            return false;
        }

        foreach (MarketingOptIn recipient in recipients)
        {
            string hash = MarketingOptInService.HashFor(recipient.Phone);
            if (current.SentTo.Contains(hash))
            {
                continue;
            }

            SendAttempt attempt = await sender.TrySendAsync(TextKind.Announcement, current.Id, recipient.Phone, current.Message, cancellationToken);
            if (attempt.Outcome == SendOutcome.Disabled)
            {
                await SaveProgressAsync(blobName, current with { State = AnnouncementSendState.Queued }, current.ClaimedAt, cancellationToken);
                return false;
            }

            current = Record(current, hash, attempt.Outcome);
            DateTimeOffset checkpoint = time.GetUtcNow();
            AnnouncementSend? saved = await SaveProgressAsync(blobName, current with { ClaimedAt = checkpoint }, current.ClaimedAt, cancellationToken);
            if (saved is null)
            {
                LogClaimLost(logger, current.Id);
                return false;
            }

            current = saved;
        }

        await SaveProgressAsync(blobName, current with { State = AnnouncementSendState.Done, DoneAt = time.GetUtcNow() }, current.ClaimedAt, cancellationToken);
        LogDone(logger, current.Id, current.SentCount, current.FailedCount);
        return true;
    }

    /// <summary>A sent, refused-for-STOP or unanswered text is not tried again; only a text Twilio plainly refused counts as failed and is left for no retry either.</summary>
    private static AnnouncementSend Record(AnnouncementSend send, string hash, SendOutcome outcome) => outcome switch
    {
        SendOutcome.Sent => send with { SentCount = send.SentCount + 1, SentTo = [.. send.SentTo, hash] },
        SendOutcome.OptedOut => send with { SentTo = [.. send.SentTo, hash] },
        SendOutcome.Uncertain => send with { FailedCount = send.FailedCount + 1, SentTo = [.. send.SentTo, hash] },
        _ => send with { FailedCount = send.FailedCount + 1 },
    };

    private async Task<bool> IsDueAsync(AnnouncementSend send, DateTimeOffset now, CancellationToken cancellationToken)
    {
        switch (send.State)
        {
            case AnnouncementSendState.Queued:
                return true;
            case AnnouncementSendState.Sending:
                return send.ClaimedAt is null || now - send.ClaimedAt >= StaleAfter;
            case AnnouncementSendState.Scheduled:
                ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
                return send.SendOn <= TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone).ToLocalDate(now);
            default:
                return false;
        }
    }

    /// <summary>
    /// Saves the send's progress only while it is still the claim this worker made (its <see cref="AnnouncementSend.ClaimedAt"/>
    /// unchanged), and returns it; null when another worker has taken over or the blob changed under this one.
    /// </summary>
    private async Task<AnnouncementSend?> SaveProgressAsync(string blobName, AnnouncementSend next, DateTimeOffset? expectedClaim, CancellationToken cancellationToken)
    {
        string container = storageSettings.Value.ContentContainerName;
        StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
        if (stored is null || Read(stored.Text).ClaimedAt != expectedClaim)
        {
            return null;
        }

        return await storage.TryReplaceTextAsync(container, blobName, Serialize(next), stored.ETag, cancellationToken) ? next : null;
    }

    private async Task<(AnnouncementSend Send, string ETag)?> ReadAsync(string id, CancellationToken cancellationToken)
    {
        StoredText? stored = await storage.ReadTextWithETagAsync(storageSettings.Value.ContentContainerName, BlobName(id), cancellationToken);
        return stored is null ? null : (Read(stored.Text), stored.ETag);
    }

    private static AnnouncementTextStatus ToStatus(AnnouncementSend send) => new(
        send.Id,
        send.State,
        send.SendOn,
        send.Total,
        send.SentCount,
        send.FailedCount
    );

    private static string BlobName(string id) => $"{Prefix}{id}.json";

    private static AnnouncementSend Read(string text) =>
        JsonSerializer.Deserialize<AnnouncementSend>(text, TextJson.Options)
        ?? throw new JsonException("An announcement send blob was empty.");

    private static string Serialize(AnnouncementSend send) => JsonSerializer.Serialize(send, TextJson.Options);

    [LoggerMessage(EventName = "AnnouncementTextDone", Level = LogLevel.Information, Message = "Announcement text {Id} finished: {Sent} sent, {Failed} not delivered to Twilio.")]
    private static partial void LogDone(ILogger logger, string id, int sent, int failed);

    [LoggerMessage(EventName = "AnnouncementTextClaimLost", Level = LogLevel.Warning, Message = "Announcement text {Id} was taken over by another worker, so this one stopped.")]
    private static partial void LogClaimLost(ILogger logger, string id);
}
