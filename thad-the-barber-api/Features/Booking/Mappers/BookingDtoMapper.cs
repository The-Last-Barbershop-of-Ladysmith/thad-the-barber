using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Booking.Mappers;

public static class BookingDtoMapper
{
    public static BookingConfirmation ToConfirmation(this Appointment appointment) => new(
        appointment.Id,
        appointment.StartAt.ToUniversalTime()
    );
}
