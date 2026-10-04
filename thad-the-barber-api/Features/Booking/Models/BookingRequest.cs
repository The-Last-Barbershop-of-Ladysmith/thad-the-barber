namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>A customer's booking, with the shop's local <see cref="Date"/> ("2026-10-03") and <see cref="Time"/> ("14:30").</summary>
public sealed record BookingRequest(
    string Date,
    string Time,
    string Name,
    string Phone
);
