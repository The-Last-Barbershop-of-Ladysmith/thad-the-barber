namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>A customer's booking. <see cref="StartAt"/> is the chosen <see cref="TimeSlot.StartAt"/>, unchanged.</summary>
public sealed record BookingRequest(
    DateTimeOffset StartAt,
    string Name,
    string Phone
);
