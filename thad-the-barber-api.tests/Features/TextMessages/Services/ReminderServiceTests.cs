using System.Text.Json;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Exceptions;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

public sealed class ReminderServiceTests
{
    private const string Phone = "+15550100162";

    // The shop is on New York time: 15:00 UTC on Nov 18 is 10:00 there, and the booking is 15:00 on Nov 19 there.
    private static readonly DateTimeOffset now = new(2026, 11, 18, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset bookingStart = new(2026, 11, 19, 20, 0, 0, TimeSpan.Zero);
    private const string JobName = "reminders/2026-11-19/BOOKING1.json";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ABookingFarEnoughAheadGetsAPendingJobUnderItsShopLocalStartDate()
    {
        TextHarness texts = Harness();

        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);

        JsonElement job = ReadJob(texts, JobName);
        Assert.Equal("pending", job.GetProperty("state").GetString());
        Assert.Equal(Phone, job.GetProperty("phone").GetString());
        Assert.Equal(bookingStart, job.GetProperty("startAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task ALateNightBookingIsFiledUnderTheShopsDateNotUtcs()
    {
        TextHarness texts = Harness();
        DateTimeOffset elevenPmShopTime = new(2026, 11, 21, 4, 0, 0, TimeSpan.Zero);

        await texts.Reminders.ScheduleAsync(Booking(elevenPmShopTime), Phone, Cancellation);

        Assert.Contains("reminders/2026-11-20/BOOKING1.json", texts.Storage.ContentFiles.Keys);
    }

    [Fact]
    public async Task ABookingMadeCloserToItsStartThanTheLeadGetsNoJob()
    {
        TextHarness texts = Harness();

        await texts.Reminders.ScheduleAsync(Booking(now + TimeSpan.FromHours(23)), Phone, Cancellation);

        Assert.Empty(texts.Storage.ContentFiles);
    }

    [Fact]
    public async Task ADueReminderIsTextedWithTheManageLinkAndTheShopLocalTimeThenMarkedSent()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));

        int sent = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(1, sent);
        FakeTwilioMessageService.SentText text = Assert.Single(texts.Twilio.Sent);
        Assert.Equal(Phone, text.Phone);
        Assert.Contains("Thu, Nov 19 at 3:00 PM", text.Body, StringComparison.Ordinal);
        Assert.Contains($"{TextHarness.SiteUrl}/book/manage/BOOKING1#t={ManageTokens.Signer.Sign("BOOKING1")}", text.Body, StringComparison.Ordinal);
        Assert.Contains("Reply STOP to opt out.", text.Body, StringComparison.Ordinal);
        JsonElement job = ReadJob(texts, JobName);
        Assert.Equal("sent", job.GetProperty("state").GetString());
        Assert.Equal(text.Sid, job.GetProperty("messageSid").GetString());
    }

    [Fact]
    public async Task ARunThatComesAgainSendsNothingMore()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));

        await texts.Reminders.RunAsync(Cancellation);
        int second = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(0, second);
        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task AReminderNotYetWithinItsLeadIsLeftForALaterRun()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);

        int sent = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(0, sent);
        Assert.Equal("pending", ReadJob(texts, JobName).GetProperty("state").GetString());
    }

    [Fact]
    public async Task AReminderFoundTooCloseToTheStartIsSkippedNotSent()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromMinutes(90));

        int sent = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(0, sent);
        Assert.Empty(texts.Twilio.Sent);
        Assert.Equal("skipped", ReadJob(texts, JobName).GetProperty("state").GetString());
    }

    [Fact]
    public async Task ARefusedReminderGoesBackToPendingAndTheNextRunSendsIt()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));
        texts.Twilio.Failure = new TwilioRequestFailedException(400, 21211);

        int first = await texts.Reminders.RunAsync(Cancellation);
        Assert.Equal("pending", ReadJob(texts, JobName).GetProperty("state").GetString());
        texts.Twilio.Failure = null;
        int second = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal((0, 1), (first, second));
    }

    [Fact]
    public async Task ATwilioThatDidNotAnswerLeavesTheReminderClaimedAndItIsNotSentAgain()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));
        texts.Twilio.Failure = new TwilioRequestFailedException(0, null);

        await texts.Reminders.RunAsync(Cancellation);
        texts.Twilio.Failure = null;
        int second = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(0, second);
        Assert.Empty(texts.Twilio.Sent);
        Assert.Equal("claimed", ReadJob(texts, JobName).GetProperty("state").GetString());
    }

    [Fact]
    public async Task APhoneThatRepliedSTOPIsSkippedAndOptedOut()
    {
        TextHarness texts = Harness();
        await texts.OptIns.SignUpAsync(Phone, Cancellation);
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));
        texts.Twilio.Failure = new TwilioRequestFailedException(400, 21610);

        await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal("skipped", ReadJob(texts, JobName).GetProperty("state").GetString());
        Assert.Empty(await texts.OptIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task ARunThatLosesTheClaimToAnotherInstanceSendsNothing()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(bookingStart), Phone, Cancellation);
        texts.Time.SetUtcNow(bookingStart - TimeSpan.FromHours(20));
        texts.Storage.BeforeNextReplace = () => texts.Storage.ContentFiles[JobName] += " ";

        int sent = await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(0, sent);
        Assert.Empty(texts.Twilio.Sent);
    }

    [Fact]
    public async Task OnlyTheNextFewDaysAreRead()
    {
        TextHarness texts = Harness();
        await texts.Reminders.ScheduleAsync(Booking(now + TimeSpan.FromDays(9)), Phone, Cancellation);
        int callsBefore = texts.Storage.Calls;

        await texts.Reminders.RunAsync(Cancellation);

        Assert.Equal(3, texts.Storage.Calls - callsBefore); // one listing each for today and the two days after
    }

    [Fact]
    public async Task CancellingRemovesTheJobAndRescheduleFindsThePhoneBeforeItGoes()
    {
        TextHarness texts = Harness();
        Appointment booking = Booking(bookingStart);
        await texts.Reminders.ScheduleAsync(booking, Phone, Cancellation);

        Assert.Equal(Phone, await texts.Reminders.FindPhoneAsync(booking, Cancellation));
        await texts.Reminders.CancelAsync(booking, Cancellation);

        Assert.Empty(texts.Storage.ContentFiles);
        Assert.Null(await texts.Reminders.FindPhoneAsync(booking, Cancellation));
    }

    private static TextHarness Harness() => TextHarness.Create(time: new Microsoft.Extensions.Time.Testing.FakeTimeProvider(now));

    private static Appointment Booking(DateTimeOffset startAt) => new(
        "BOOKING1",
        1,
        AppointmentStatus.Accepted,
        startAt
    );

    private static JsonElement ReadJob(TextHarness texts, string name) => JsonDocument.Parse(texts.Storage.ContentFiles[name]).RootElement;
}
