using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

public sealed class BookingTextServiceTests
{
    private const string Phone = "+15550100163";

    private static readonly DateTimeOffset now = new(2026, 11, 18, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset bookingStart = new(2026, 11, 20, 20, 0, 0, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ABookingTextsItsConfirmationWithTheUniqueManageLinkNotSquaresUrl()
    {
        TextHarness texts = Harness();

        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        FakeTwilioMessageService.SentText text = Assert.Single(texts.Twilio.Sent);
        Assert.Equal(Phone, text.Phone);
        Assert.StartsWith("O'Neil & Søn Barbershop: you're booked for Fri, Nov 20 at 3:00 PM.", text.Body, StringComparison.Ordinal);
        Assert.Contains($"{TextHarness.SiteUrl}/book/manage/BOOKING1#t={ManageTokens.Signer.Sign("BOOKING1")}", text.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("square", text.Body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ABookingFarEnoughAheadAlsoGetsItsReminderJob()
    {
        TextHarness texts = Harness();

        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        Assert.Contains("reminders/2026-11-20/BOOKING1.json", texts.Storage.ContentFiles.Keys);
    }

    [Fact]
    public async Task ABookingMadeWithinADayOfItsStartGetsTheConfirmationAndNoReminder()
    {
        TextHarness texts = Harness();

        await texts.Bookings.AfterBookedAsync(Booking(now + TimeSpan.FromHours(5)), Phone, Cancellation);

        Assert.Single(texts.Twilio.Sent);
        Assert.DoesNotContain(texts.Storage.ContentFiles.Keys, name => name.StartsWith("reminders/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task TheSameBookingConfirmedAgainIsNotTextedTwice()
    {
        TextHarness texts = Harness();

        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);
        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task WhileTextsAreOffABookingChangesNothing()
    {
        TextHarness texts = TextHarness.Disabled(time: new FakeTimeProvider(now));

        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        Assert.Empty(texts.Twilio.Sent);
        Assert.Empty(texts.Storage.ContentFiles);
        Assert.Equal(0, texts.Storage.Calls);
    }

    [Fact]
    public async Task AFailureNeverEscapesBecauseTheBookingIsAlreadyMade()
    {
        TextHarness texts = Harness();
        texts.Storage.Failure = new InvalidOperationException("storage is down");

        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);
        await texts.Bookings.AfterCancelledAsync(Booking(bookingStart), Cancellation);
        await texts.Bookings.AfterRescheduledAsync(Booking(bookingStart), Booking(bookingStart.AddDays(1)), Cancellation);

        Assert.Empty(texts.Twilio.Sent);
    }

    [Fact]
    public async Task CancellingTheBookingRemovesItsReminder()
    {
        TextHarness texts = Harness();
        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        await texts.Bookings.AfterCancelledAsync(Booking(bookingStart), Cancellation);

        Assert.DoesNotContain(texts.Storage.ContentFiles.Keys, name => name.StartsWith("reminders/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ReschedulingMovesTheReminderToTheNewDayWithTheSamePhone()
    {
        TextHarness texts = Harness();
        await texts.Bookings.AfterBookedAsync(Booking(bookingStart), Phone, Cancellation);

        await texts.Bookings.AfterRescheduledAsync(Booking(bookingStart), Booking(bookingStart.AddDays(2)), Cancellation);

        Assert.DoesNotContain("reminders/2026-11-20/BOOKING1.json", texts.Storage.ContentFiles.Keys);
        Assert.Contains(Phone, texts.Storage.ContentFiles["reminders/2026-11-22/BOOKING1.json"], StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReschedulingABookingThatHadNoReminderStaysWithoutOne()
    {
        TextHarness texts = Harness();
        await texts.Bookings.AfterBookedAsync(Booking(now + TimeSpan.FromHours(5)), Phone, Cancellation);

        await texts.Bookings.AfterRescheduledAsync(Booking(now + TimeSpan.FromHours(5)), Booking(bookingStart), Cancellation);

        Assert.DoesNotContain(texts.Storage.ContentFiles.Keys, name => name.StartsWith("reminders/", StringComparison.Ordinal));
    }

    private static TextHarness Harness() => TextHarness.Create(time: new FakeTimeProvider(now));

    private static Appointment Booking(DateTimeOffset startAt) => new(
        "BOOKING1",
        1,
        AppointmentStatus.Accepted,
        startAt
    );
}
