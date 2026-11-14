namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// One upcoming booking for a verified phone, soonest first: no name or other customer details (BR-20).
/// <see cref="ManageToken"/> goes in the manage link like a <see cref="BookingConfirmation"/>'s.
/// </summary>
public sealed record FoundBooking(
    string Id,
    DateTimeOffset StartAt,
    string ManageToken
);
