namespace ThadTheBarber.Api.Square.Models;

/// <summary>An open time Square offers for the service, holding everything <c>CreateBooking</c> needs except the customer.</summary>
public sealed record TimeSlot(
    DateTimeOffset StartAt,
    string LocationId,
    string TeamMemberId,
    string ServiceVariationId,
    long ServiceVariationVersion
);
