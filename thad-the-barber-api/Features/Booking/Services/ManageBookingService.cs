using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// Views, cancels and reschedules one booking through its manage link (BR-08), until its start time (BR-07). The
/// token is checked before Square is called, so a wrong one costs no Square request. Repeating a cancel or reschedule
/// that already happened returns the booking as it is, so a retry after a lost response is safe.
/// </summary>
public sealed class ManageBookingService(
    ISquareService square,
    AvailabilityService availability,
    ManageTokenSigner manageTokens,
    TimeProvider time)
{
    public async Task<ManagedBooking> GetAsync(string bookingId, string? manageToken, CancellationToken cancellationToken)
    {
        Appointment appointment = await FindAsync(bookingId, manageToken, cancellationToken);
        return ToManagedBooking(appointment);
    }

    public async Task<ManagedBooking> CancelAsync(string bookingId, string? manageToken, CancellationToken cancellationToken)
    {
        Appointment appointment = await FindAsync(bookingId, manageToken, cancellationToken);
        if (appointment.IsCancelled)
        {
            return ToManagedBooking(appointment);
        }

        EnsureNotStarted(appointment);
        Appointment cancelled = await square.CancelBookingAsync(appointment.Id, appointment.Version, cancellationToken);

        return ToManagedBooking(cancelled);
    }

    public async Task<ManagedBooking> RescheduleAsync(string bookingId, string? manageToken, RescheduleRequest request, CancellationToken cancellationToken)
    {
        Appointment appointment = await FindAsync(bookingId, manageToken, cancellationToken);
        if (appointment.IsCancelled)
        {
            throw new BookingCancelledException($"Booking {bookingId} is {appointment.Status}.");
        }

        EnsureNotStarted(appointment);
        if (appointment.StartAt == request.StartAt)
        {
            return ToManagedBooking(appointment);
        }

        TimeSlot openTimeSlot = await availability.FindTimeSlotAsync(request.StartAt, cancellationToken)
            ?? throw new SlotUnavailableException("The new time is taken or outside the booking window.");
        Appointment rescheduled = await square.RescheduleBookingAsync(appointment.Id, appointment.Version, openTimeSlot.StartAt, cancellationToken);

        return ToManagedBooking(rescheduled);
    }

    private async Task<Appointment> FindAsync(string bookingId, string? manageToken, CancellationToken cancellationToken)
    {
        if (!manageTokens.IsValid(bookingId, manageToken))
        {
            throw new BookingNotFoundException($"The manage token for booking {bookingId} is missing or wrong.");
        }

        return await square.GetBookingAsync(bookingId, cancellationToken)
            ?? throw new BookingNotFoundException($"Square has no booking {bookingId}.");
    }

    private void EnsureNotStarted(Appointment appointment)
    {
        if (!CanChange(appointment))
        {
            throw new BookingStartedException($"Booking {appointment.Id} started at {appointment.StartAt:O} and is {appointment.Status}.");
        }
    }

    private ManagedBooking ToManagedBooking(Appointment appointment) =>
        appointment.ToManagedBookingDto(CanChange(appointment));

    private bool CanChange(Appointment appointment) =>
        appointment.IsActive && time.GetUtcNow() < appointment.StartAt;
}
