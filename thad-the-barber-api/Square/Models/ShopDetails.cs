namespace ThadTheBarber.Api.Square.Models;

/// <summary>The shop's Square location. <see cref="Phone"/> is E.164; <see cref="TimeZone"/> is an IANA id.</summary>
public sealed record ShopDetails(
    string LocationId,
    string Name,
    string Phone,
    string TimeZone,
    ShopAddress Address,
    List<OpeningPeriod> Hours,
    string? Description,
    string? InstagramUsername,
    string? FacebookUrl
);
