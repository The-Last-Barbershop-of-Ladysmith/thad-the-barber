using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class BookingMapper
{
    public static AvailableSlot ToAvailableSlot(this Availability availability) => new(
        ParseInstant(availability.StartAt, "availability"),
        availability.AppointmentSegments?.FirstOrDefault()?.TeamMemberId
            ?? throw new InvalidOperationException("A Square availability has no team member."));

    public static ShopBooking ToShopBooking(this Booking booking) => new(
        booking.Id ?? throw new InvalidOperationException("A Square booking has no id."),
        booking.Version ?? 0,
        Enum.Parse<ShopBookingStatus>(
            (booking.Status ?? throw new InvalidOperationException($"Square booking {booking.Id} has no status.")).Value.Replace("_", string.Empty, StringComparison.Ordinal),
            ignoreCase: true),
        ParseInstant(booking.StartAt, $"booking {booking.Id}"),
        booking.CustomerId);

    private static DateTimeOffset ParseInstant(string? rfc3339, string owner) => DateTimeOffset.Parse(
        rfc3339 ?? throw new InvalidOperationException($"The Square {owner} has no start time."),
        CultureInfo.InvariantCulture);
}
