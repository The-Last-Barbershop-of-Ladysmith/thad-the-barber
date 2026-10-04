namespace ThadTheBarber.Api.Square.Models;

public sealed record AvailableSlot(
    DateTimeOffset StartAt,
    string TeamMemberId
);
