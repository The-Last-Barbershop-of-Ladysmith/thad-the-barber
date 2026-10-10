namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>A day in the shop's timezone and its open start times, as UTC instants.</summary>
public sealed record AvailableDay(
    DateOnly Date,
    List<DateTimeOffset> Times
);
