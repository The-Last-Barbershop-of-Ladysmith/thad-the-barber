namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// A customer's booking. <see cref="StartAt"/> is one of the UTC start times availability returned, sent back
/// unchanged; <see cref="IdempotencyKey"/> is a UUID the client generates once per booking attempt.
/// </summary>
public sealed record BookingRequest(
    DateTimeOffset StartAt,
    string Name,
    string Phone,
    Guid IdempotencyKey
);
