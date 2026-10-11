using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>The new time: one of the UTC start times availability returned, sent back unchanged.</summary>
public sealed record RescheduleRequest(
    [property: JsonRequired] DateTimeOffset StartAt
);
