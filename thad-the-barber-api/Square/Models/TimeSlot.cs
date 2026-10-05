namespace ThadTheBarber.Api.Square.Models;

/// <summary>An open time Square offers for the service. Booking it needs <see cref="TeamMemberId"/>.</summary>
public sealed record TimeSlot(
    DateTimeOffset StartAt,
    string TeamMemberId
);
