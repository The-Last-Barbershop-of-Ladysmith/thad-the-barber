namespace ThadTheBarber.Api.Square.Models;

/// <summary>
/// A catalog service variation open for online booking. <c>CreateBooking</c> needs its id and version; no price,
/// because the site doesn't show one (BR-11).
/// </summary>
public sealed record BookableService(
    string Name,
    string VariationId,
    long VariationVersion,
    TimeSpan Duration,
    List<string> TeamMemberIds
);
