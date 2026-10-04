namespace ThadTheBarber.Api.Square.Models;

/// <summary>The shop's Square location. <see cref="Phone"/> is E.164; <see cref="TimeZone"/> is an IANA id.</summary>
public sealed record ShopLocation(
    string Name,
    string Phone,
    string TimeZone,
    ShopAddress Address,
    IReadOnlyList<ShopHoursPeriod> Hours,
    string? Description,
    string? InstagramUsername,
    string? FacebookUrl
);
