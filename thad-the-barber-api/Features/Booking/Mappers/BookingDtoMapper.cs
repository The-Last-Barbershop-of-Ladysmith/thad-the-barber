using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Booking.Mappers;

public static class BookingDtoMapper
{
    public static TimeSlot ToTimeSlot(this AvailableSlot slot) => new(
        slot.StartAt.ToUniversalTime(),
        Available: true
    );

    /// <summary>The start comes from Square's booking; the name and phone from the request, since Square only holds a customer id.</summary>
    public static BookingConfirmation ToConfirmation(this ShopBooking booking, BookingRequest request) => new(
        booking.Id,
        booking.StartAt.ToUniversalTime(),
        request.Name,
        request.Phone
    );
}
