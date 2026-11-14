namespace ThadTheBarber.Api.Features.Booking.Models;

public sealed record VerifiedList(
    List<FoundBooking> Bookings,
    string LookupToken,
    DateTimeOffset ExpiresAt
);
