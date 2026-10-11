using System.Globalization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

/// <summary>
/// The clock starts at 11:10 shop time on 2026-10-06, a day before the booking; see <c>AvailabilityServiceTests</c>.
/// The fake Square cancels and reschedules like Square does (see <see cref="FakeSquareService"/>).
/// </summary>
public sealed class ManageBookingServiceTests
{
    private static readonly DateTimeOffset now = Instant("2026-10-06T15:10:00Z");
    private static readonly DateTimeOffset bookedTime = Instant("2026-10-07T13:30:00Z");
    private static readonly DateTimeOffset newTime = Instant("2026-10-08T14:00:00Z");

    private readonly FakeSquareService _square = new();
    private readonly FakeTimeProvider _time = new(now);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AnUpcomingBookingShowsItsTimeAndCanChange()
    {
        Appointment appointment = await BookAsync(bookedTime);

        ManagedBooking booking = await Service().GetAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.Equal(
            new ManagedBooking(
                appointment.Id,
                bookedTime,
                false,
                true
            ),
            booking);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("forged-token")]
    public async Task AMissingOrWrongTokenIsNotFound(string? manageToken)
    {
        Appointment appointment = await BookAsync(bookedTime);
        ManageBookingService service = Service();

        await Assert.ThrowsAsync<BookingNotFoundException>(() => service.GetAsync(appointment.Id, manageToken, Cancellation));
        await Assert.ThrowsAsync<BookingNotFoundException>(() => service.CancelAsync(appointment.Id, manageToken, Cancellation));
        await Assert.ThrowsAsync<BookingNotFoundException>(() => service.RescheduleAsync(appointment.Id, manageToken, new RescheduleRequest(newTime), Cancellation));
        Assert.Equal(AppointmentStatus.Accepted, Assert.Single(_square.Bookings).Appointment.Status);
    }

    [Fact]
    public async Task AnotherBookingsTokenIsNotFound()
    {
        Appointment appointment = await BookAsync(bookedTime);
        Appointment otherAppointment = await BookAsync(newTime);

        await Assert.ThrowsAsync<BookingNotFoundException>(() => Service().CancelAsync(appointment.Id, Token(otherAppointment), Cancellation));
    }

    [Fact]
    public async Task ASignedIdSquareDoesntHaveIsNotFound()
    {
        await Assert.ThrowsAsync<BookingNotFoundException>(() => Service().GetAsync("bk_test-gone01", ManageTokens.Signer.Sign("bk_test-gone01"), Cancellation));
    }

    [Fact]
    public async Task CancellingFreesTheTimeAndCanNoLongerChange()
    {
        Appointment appointment = await BookAsync(bookedTime);

        ManagedBooking booking = await Service().CancelAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.True(booking.IsCancelled);
        Assert.False(booking.CanChange);
        Assert.Equal(AppointmentStatus.CancelledByCustomer, Assert.Single(_square.Bookings).Appointment.Status);
        Assert.Contains(_square.TimeSlots, timeSlot => timeSlot.StartAt == bookedTime);
    }

    [Fact]
    public async Task CancellingAgainReturnsTheCancelledBookingWithoutAskingSquare()
    {
        Appointment appointment = await BookAsync(bookedTime);
        ManageBookingService service = Service();
        ManagedBooking cancelled = await service.CancelAsync(appointment.Id, Token(appointment), Cancellation);
        int cancelledVersion = Assert.Single(_square.Bookings).Appointment.Version;

        ManagedBooking cancelledAgain = await service.CancelAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.Equal(cancelled, cancelledAgain);
        Assert.Equal(cancelledVersion, Assert.Single(_square.Bookings).Appointment.Version);
    }

    [Fact]
    public async Task ACancelledBookingShowsAsCancelled()
    {
        Appointment appointment = await BookAsync(bookedTime);
        await Service().CancelAsync(appointment.Id, Token(appointment), Cancellation);

        ManagedBooking booking = await Service().GetAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.True(booking.IsCancelled);
        Assert.False(booking.CanChange);
    }

    [Fact]
    public async Task ABookingCanChangeUntilItsStartTime()
    {
        Appointment appointment = await BookAsync(bookedTime);
        _time.SetUtcNow(bookedTime - TimeSpan.FromTicks(1));

        ManagedBooking booking = await Service().CancelAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.True(booking.IsCancelled);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(60 * 24)]
    public async Task AtOrAfterTheStartTimeTheBookingIsStarted(int minutesAfterStart)
    {
        Appointment appointment = await BookAsync(bookedTime);
        _time.SetUtcNow(bookedTime + TimeSpan.FromMinutes(minutesAfterStart));
        ManageBookingService service = Service();

        ManagedBooking booking = await service.GetAsync(appointment.Id, Token(appointment), Cancellation);

        Assert.False(booking.CanChange);
        Assert.False(booking.IsCancelled);
        await Assert.ThrowsAsync<BookingStartedException>(() => service.CancelAsync(appointment.Id, Token(appointment), Cancellation));
        await Assert.ThrowsAsync<BookingStartedException>(() => service.RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation));
        Assert.Equal(appointment, Assert.Single(_square.Bookings).Appointment);
    }

    [Fact]
    public async Task ReschedulingMovesTheBookingAndFreesTheOldTime()
    {
        Appointment appointment = await BookAsync(bookedTime);

        ManagedBooking booking = await Service().RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation);

        Assert.Equal(newTime, booking.StartAt);
        Assert.True(booking.CanChange);
        Assert.Equal(newTime, Assert.Single(_square.Bookings).Appointment.StartAt);
        Assert.Contains(_square.TimeSlots, timeSlot => timeSlot.StartAt == bookedTime);
        Assert.DoesNotContain(_square.TimeSlots, timeSlot => timeSlot.StartAt == newTime);
    }

    [Fact]
    public async Task ReschedulingToTheTimeItAlreadyHasReturnsItWithoutAskingSquare()
    {
        Appointment appointment = await BookAsync(bookedTime);
        ManageBookingService service = Service();
        await service.RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation);
        int rescheduledVersion = Assert.Single(_square.Bookings).Appointment.Version;

        ManagedBooking booking = await service.RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation);

        Assert.Equal(newTime, booking.StartAt);
        Assert.Equal(rescheduledVersion, Assert.Single(_square.Bookings).Appointment.Version);
    }

    [Fact]
    public async Task ReschedulingToATakenTimeIsSlotUnavailable()
    {
        Appointment appointment = await BookAsync(bookedTime);
        await BookAsync(newTime);

        await Assert.ThrowsAsync<SlotUnavailableException>(
            () => Service().RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation));
        Assert.Equal(bookedTime, _square.Bookings[0].Appointment.StartAt);
    }

    [Fact]
    public async Task ReschedulingToAPastTimeIsSlotUnavailable()
    {
        Appointment appointment = await BookAsync(bookedTime);
        DateTimeOffset pastTime = Instant("2026-10-06T15:00:00Z");

        await Assert.ThrowsAsync<SlotUnavailableException>(
            () => Service().RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(pastTime), Cancellation));
    }

    [Fact]
    public async Task ACancelledBookingCantBeRescheduled()
    {
        Appointment appointment = await BookAsync(bookedTime);
        ManageBookingService service = Service();
        await service.CancelAsync(appointment.Id, Token(appointment), Cancellation);

        await Assert.ThrowsAsync<BookingCancelledException>(
            () => service.RescheduleAsync(appointment.Id, Token(appointment), new RescheduleRequest(newTime), Cancellation));
    }

    private async Task<Appointment> BookAsync(DateTimeOffset startAt) =>
        await _square.CreateBookingAsync(
            "CUSTOMER0TEST0000000000001",
            _square.TimeSlots.Single(timeSlot => timeSlot.StartAt == startAt),
            Guid.NewGuid().ToString(),
            Cancellation);

    private ManageBookingService Service() => new(
        _square,
        new AvailabilityService(
            _square,
            new BookableServiceResolver(_square, Options.Create(new SquareSettings())),
            _time
        ),
        ManageTokens.Signer,
        _time
    );

    private static string Token(Appointment appointment) => ManageTokens.Signer.Sign(appointment.Id);

    private static DateTimeOffset Instant(string instant) => DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture);
}
