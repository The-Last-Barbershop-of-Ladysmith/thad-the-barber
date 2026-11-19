using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.TextMessages.Exceptions;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Exceptions;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

public sealed class AnnouncementTextServiceTests
{
    // 15:00 UTC on Nov 18 is 10:00 in New York, the shop's zone.
    private static readonly DateTimeOffset now = new(2026, 11, 18, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly today = new(2026, 11, 18);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ThePreviewSuggestsTheWordingAndCountsOnlyTheSubscribersWhoCanBeTexted()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(3);
        await texts.OptIns.OptOutAsync("+15550100180", Cancellation);

        AnnouncementTextPreview preview = await texts.Announcements.PreviewAsync(
            new AnnouncementTextPreviewRequest("Open late Fridays", "<p>We are open until <strong>8 PM</strong> on Fridays.</p>", today),
            Cancellation);

        Assert.Equal(2, preview.SubscriberCount);
        Assert.True(preview.IsEnabled);
        Assert.False(preview.IsScheduled);
        Assert.Null(preview.AlreadyTexted);
        Assert.Equal(
            "O'Neil & Søn Barbershop: Open late Fridays. We are open until 8 PM on Fridays. https://www.example.com Reply STOP to opt out.",
            preview.Message);
    }

    [Fact]
    public async Task AFutureFirstDayIsPreviewedAsScheduled()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(1);

        AnnouncementTextPreview preview = await texts.Announcements.PreviewAsync(
            new AnnouncementTextPreviewRequest("Holiday hours", null, today.AddDays(5)), Cancellation);

        Assert.True(preview.IsScheduled);
    }

    [Fact]
    public async Task RequestingAnAnnouncementTextsEverySubscriberOnceThroughTheWorker()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(3);

        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal(AnnouncementSendState.Queued, status.State);
        Assert.Equal(3, texts.Twilio.Sent.Count);
        Assert.All(texts.Twilio.Sent, text => Assert.Equal("Open late Fridays! Reply STOP to opt out.", text.Body));
        AnnouncementTextStatus done = (await texts.Announcements.GetStatusAsync(status.Id, Cancellation))!;
        Assert.Equal((AnnouncementSendState.Done, 3, 0), (done.State, done.SentCount, done.FailedCount));
    }

    [Fact]
    public async Task TheSameAnnouncementRequestedAgainIs409AndNobodyIsTextedTwice()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);
        await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        await Assert.ThrowsAsync<AnnouncementAlreadyTextedException>(
            () => texts.Announcements.RequestAsync(Request("  open LATE  fridays ", today), Cancellation));
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal(2, texts.Twilio.Sent.Count);
    }

    [Fact]
    public async Task ADifferentTitleOrFirstDayIsADifferentAnnouncement()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(1);

        AnnouncementTextStatus first = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        AnnouncementTextStatus other = await texts.Announcements.RequestAsync(Request("Closed Monday", today), Cancellation);
        AnnouncementTextStatus laterDay = await texts.Announcements.RequestAsync(Request("Open late Fridays", today.AddDays(7)), Cancellation);

        Assert.Equal(3, new[] { first.Id, other.Id, laterDay.Id }.Distinct().Count());
    }

    [Fact]
    public async Task TwoRequestsRacingForTheSameAnnouncementMakeOneSend()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);

        Task<AnnouncementTextStatus>[] requests = [.. Enumerable.Range(0, 6)
            .Select(_ => texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation))];
        int refused = 0;
        foreach (Task<AnnouncementTextStatus> request in requests)
        {
            try
            {
                await request;
            }
            catch (AnnouncementAlreadyTextedException)
            {
                refused++;
            }
        }

        Assert.Equal(5, refused);
    }

    [Fact]
    public async Task WhileTextsAreOffNothingIsRequestedOrSent()
    {
        TextHarness texts = TextHarness.Disabled(time: new FakeTimeProvider(now));

        await Assert.ThrowsAsync<TextsUnavailableException>(() => texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation));
        int finished = await texts.Announcements.ProcessDueAsync(Cancellation);

        Assert.Equal(0, finished);
        Assert.Empty(texts.Storage.ContentFiles);
    }

    [Fact]
    public async Task AnAnnouncementWithAFutureFirstDayWaitsAndThenGoesOutOnThatDay()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Holiday hours", today.AddDays(3)), Cancellation);

        await texts.AnnouncementWorker.RunAsync(Cancellation);
        Assert.Empty(texts.Twilio.Sent);
        texts.Time.Advance(TimeSpan.FromDays(2));
        await texts.AnnouncementWorker.RunAsync(Cancellation);
        Assert.Empty(texts.Twilio.Sent);
        texts.Time.Advance(TimeSpan.FromDays(1));
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal(AnnouncementSendState.Scheduled, status.State);
        Assert.Equal(2, texts.Twilio.Sent.Count);
    }

    [Fact]
    public async Task ASubscriberWhoOptedOutBeforeItGoesOutIsNotTexted()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);
        await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        await texts.OptIns.OptOutAsync("+15550100180", Cancellation);

        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal("+15550100181", Assert.Single(texts.Twilio.Sent).Phone);
    }

    [Fact]
    public async Task AFailureForOnePhoneDoesNotStopTheRestAndIsCounted()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(3);
        texts.Twilio.FailingPhones.Add("+15550100181");
        texts.Twilio.PhoneFailure = new TwilioRequestFailedException(400, 21211);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);

        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal(2, texts.Twilio.Sent.Count);
        AnnouncementTextStatus done = (await texts.Announcements.GetStatusAsync(status.Id, Cancellation))!;
        Assert.Equal((AnnouncementSendState.Done, 2, 1), (done.State, done.SentCount, done.FailedCount));
    }

    [Fact]
    public async Task APhoneThatRepliedSTOPToTheSenderIsOptedOutAndNotCountedAsFailed()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);
        texts.Twilio.FailingPhones.Add("+15550100180");
        texts.Twilio.PhoneFailure = new TwilioRequestFailedException(400, TextMessageSender.RecipientOptedOutErrorCode);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);

        await texts.AnnouncementWorker.RunAsync(Cancellation);

        AnnouncementTextStatus done = (await texts.Announcements.GetStatusAsync(status.Id, Cancellation))!;
        Assert.Equal((1, 0), (done.SentCount, done.FailedCount));
        Assert.Single(await texts.OptIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task ASendThatStoppedMidwayIsTakenOverAfterTenMinutesAndOnlyTextsThePeopleLeft()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(4);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        string blobName = $"announcement-sends/{status.Id}.json";
        // The first worker texted two people and then stopped: its record says Sending, with two phones handled.
        List<string> firstTwo = [.. (await texts.OptIns.ListActiveAsync(Cancellation)).Take(2).Select(optIn => ThadTheBarber.Api.Features.MarketingTexts.Services.MarketingOptInService.HashFor(optIn.Phone))];
        AnnouncementSend stopped = JsonSerializer.Deserialize<AnnouncementSend>(texts.Storage.ContentFiles[blobName], TextJson.Options)! with
        {
            State = AnnouncementSendState.Sending,
            ClaimedAt = texts.Time.GetUtcNow(),
            SentCount = 2,
            SentTo = firstTwo,
        };
        texts.Storage.ContentFiles[blobName] = JsonSerializer.Serialize(stopped, TextJson.Options);

        await texts.AnnouncementWorker.RunAsync(Cancellation);
        Assert.Empty(texts.Twilio.Sent);
        texts.Time.Advance(AnnouncementTextService.StaleAfter + TimeSpan.FromSeconds(1));
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal(2, texts.Twilio.Sent.Count);
        Assert.DoesNotContain(texts.Twilio.Sent, text => firstTwo.Contains(ThadTheBarber.Api.Features.MarketingTexts.Services.MarketingOptInService.HashFor(text.Phone)));
        Assert.Equal(AnnouncementSendState.Done, (await texts.Announcements.GetStatusAsync(status.Id, Cancellation))!.State);
    }

    [Fact]
    public async Task AWorkerThatLosesItsClaimMidwayStopsWithoutTextingMore()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(4);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        string blobName = $"announcement-sends/{status.Id}.json";
        texts.Twilio.AfterSend = () =>
        {
            AnnouncementSend taken = JsonSerializer.Deserialize<AnnouncementSend>(texts.Storage.ContentFiles[blobName], TextJson.Options)! with
            {
                ClaimedAt = texts.Time.GetUtcNow().AddMinutes(1),
            };
            texts.Storage.ContentFiles[blobName] = JsonSerializer.Serialize(taken, TextJson.Options);
            texts.Twilio.AfterSend = null;
        };

        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task APhoneIsNeverKeptInTheSendRecord()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(2);
        AnnouncementTextStatus status = await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);
        await texts.AnnouncementWorker.RunAsync(Cancellation);

        string record = texts.Storage.ContentFiles[$"announcement-sends/{status.Id}.json"];

        Assert.DoesNotContain("5550100", record, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ARequestSignalsTheWorker()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(1);

        await texts.Announcements.RequestAsync(Request("Open late Fridays", today), Cancellation);

        Assert.True(texts.Signal.Reader.TryRead(out bool _));
    }

    [Fact]
    public async Task TheMessageGetsAnOptOutLineWhenTheAdminLeftItOut()
    {
        TextHarness texts = await HarnessWithSubscribersAsync(1);
        await texts.Announcements.RequestAsync(new AnnouncementTextRequest("Open late Fridays", today, "Late Fridays now"), Cancellation);

        await texts.AnnouncementWorker.RunAsync(Cancellation);

        Assert.Equal("Late Fridays now Reply STOP to opt out.", Assert.Single(texts.Twilio.Sent).Body);
    }

    [Fact]
    public async Task AnUnknownIdHasNoStatus()
    {
        TextHarness texts = TextHarness.Create();

        Assert.Null(await texts.Announcements.GetStatusAsync("nope", Cancellation));
    }

    private static AnnouncementTextRequest Request(string title, DateOnly startDate) =>
        new(title, startDate, "Open late Fridays! Reply STOP to opt out.");

    private static async Task<TextHarness> HarnessWithSubscribersAsync(int count)
    {
        TextHarness texts = TextHarness.Create(time: new FakeTimeProvider(now - TimeSpan.FromHours(1)));
        for (int index = 0; index < count; index++)
        {
            await texts.OptIns.SignUpAsync($"+155501001{80 + index}", Cancellation);
            texts.Time.Advance(TimeSpan.FromSeconds(1));
        }

        texts.Time.SetUtcNow(now);
        return texts;
    }
}
