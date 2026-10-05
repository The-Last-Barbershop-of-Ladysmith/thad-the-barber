namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// The booked appointment: no customer details, since the client already has them (BR-07). <see cref="StartAt"/> is
/// UTC; the UI shows it in the shop's timezone.
/// </summary>
public sealed record BookingConfirmation(
    string Id,
    DateTimeOffset StartAt
);
