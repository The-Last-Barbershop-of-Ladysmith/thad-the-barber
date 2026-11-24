namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>The blob that says a one-off text (a booking's confirmation) was claimed, and later how it ended.</summary>
public sealed record SendMarker(
    SendMarkerState State,
    DateTimeOffset ClaimedAt,
    DateTimeOffset? FinishedAt,
    string? MessageSid
);
