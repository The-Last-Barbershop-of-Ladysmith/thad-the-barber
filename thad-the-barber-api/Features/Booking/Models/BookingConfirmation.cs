namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>The booked appointment. <see cref="StartAt"/> is Square's UTC start; the UI shows it in the shop's timezone.</summary>
public sealed record BookingConfirmation(
    string Id,
    DateTimeOffset StartAt,
    string Name,
    string Phone
);
