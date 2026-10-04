using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Booking.Mappers;

public static class BookingDtoMapper
{
    public static TimeSlot ToTimeSlot(this AvailableSlot slot, ShopTime shopTime)
    {
        ShopDateTime local = shopTime.ToLocal(slot.StartAt);
        return new TimeSlot(local.TimeKey, local.Label, Available: true);
    }

    public static DateTimeOffset ToStartAt(this BookingRequest request, ShopTime shopTime) =>
        shopTime.ToInstant(ShopDateTime.Parse(request.Date, request.Time));

    /// <summary>The date and time come from Square's booking; the name and phone from the request, since Square only holds a customer id.</summary>
    public static BookingConfirmation ToConfirmation(this ShopBooking booking, BookingRequest request, ShopTime shopTime)
    {
        ShopDateTime local = shopTime.ToLocal(booking.StartAt);
        return new BookingConfirmation(booking.Id, local.DateKey, local.TimeKey, request.Name, request.Phone);
    }
}
