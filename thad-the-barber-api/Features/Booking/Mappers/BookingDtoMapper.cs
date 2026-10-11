using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Booking.Mappers;

public static class BookingDtoMapper
{
    public static BookingConfirmation ToBookingConfirmationDto(this Appointment appointment, string manageToken) => new(
        appointment.Id,
        appointment.StartAt,
        manageToken
    );
}
