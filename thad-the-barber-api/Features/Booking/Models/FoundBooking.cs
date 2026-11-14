namespace ThadTheBarber.Api.Features.Booking.Models;

// No name or other customer details (BR-20).
public sealed record FoundBooking(
    string Id,
    DateTimeOffset StartAt,
    string ManageToken
);
