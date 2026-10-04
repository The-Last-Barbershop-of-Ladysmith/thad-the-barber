namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// One bookable time, as a UTC instant. The UI shows it in the shop's timezone (<c>ShopInfo.TimeZone</c>) and sends
/// <see cref="StartAt"/> back unchanged to book it.
/// </summary>
public sealed record TimeSlot(
    DateTimeOffset StartAt,
    bool Available
);
