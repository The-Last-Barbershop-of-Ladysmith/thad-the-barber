namespace ThadTheBarber.Api.Square.Models;

/// <summary>A Square booking. Rescheduling or cancelling it needs <see cref="Version"/>.</summary>
public sealed record Appointment(
    string Id,
    int Version,
    AppointmentStatus Status,
    DateTimeOffset StartAt
);
