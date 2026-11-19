using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

public sealed class ReminderWorkerTests
{
    private const string Phone = "+15550100164";

    // 17:00 UTC is 12:00 in New York, one of the default reminder hours; 21:00 UTC is 16:00, which is not.
    private static readonly DateTimeOffset atNoon = new(2026, 11, 18, 17, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset atFour = new(2026, 11, 18, 21, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset bookingStart = new(2026, 11, 19, 16, 0, 0, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task InAReminderHourItSendsWhatIsDue()
    {
        TextHarness texts = await HarnessWithJobAsync(atNoon);

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.True(didRun);
        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task ItRunsOncePerReminderHourHoweverOftenItChecks()
    {
        TextHarness texts = await HarnessWithJobAsync(atNoon);
        await texts.Worker.RunIfDueAsync(Cancellation);
        texts.Time.Advance(TimeSpan.FromMinutes(5));
        int callsBefore = texts.Storage.Calls;

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.False(didRun);
        Assert.Equal(callsBefore, texts.Storage.Calls);
    }

    [Fact]
    public async Task OutsideTheReminderHoursItTouchesNothing()
    {
        TextHarness texts = await HarnessWithJobAsync(atFour);
        int callsBefore = texts.Storage.Calls;

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.False(didRun);
        Assert.Equal(callsBefore, texts.Storage.Calls);
        Assert.Empty(texts.Twilio.Sent);
    }

    [Fact]
    public async Task ItRunsAgainInTheNextReminderHour()
    {
        TextHarness texts = await HarnessWithJobAsync(atNoon);
        await texts.Worker.RunIfDueAsync(Cancellation);
        texts.Time.SetUtcNow(atNoon + TimeSpan.FromHours(3));

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.True(didRun);
    }

    [Fact]
    public async Task WhileTextsAreOffItDoesNothingAtAll()
    {
        TextHarness texts = TextHarness.Disabled(time: new FakeTimeProvider(atNoon));

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.False(didRun);
        Assert.Equal(0, texts.Storage.Calls);
    }

    [Fact]
    public async Task AFailedRunIsSwallowedSoTheWorkerKeepsGoing()
    {
        TextHarness texts = await HarnessWithJobAsync(atNoon);
        texts.Storage.Failure = new InvalidOperationException("storage is down");

        bool didRun = await texts.Worker.RunIfDueAsync(Cancellation);

        Assert.False(didRun);
    }

    private static async Task<TextHarness> HarnessWithJobAsync(DateTimeOffset now)
    {
        TextHarness texts = TextHarness.Create(time: new FakeTimeProvider(now - TimeSpan.FromDays(3)));
        await texts.Reminders.ScheduleAsync(
            new Appointment("BOOKING1", 1, AppointmentStatus.Accepted, bookingStart),
            Phone,
            Cancellation
        );
        texts.Time.SetUtcNow(now);
        return texts;
    }
}
