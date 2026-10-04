namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// The shop's details, like the UI's <c>ShopInfo</c>. <see cref="Tagline"/>, <see cref="Area"/> and <see cref="Reviews"/>
/// aren't in Square; they stay null until the content file (#25) and Google reviews (#36) fill them. <see cref="TimeZone"/>
/// is the IANA id the UI shows every time in, whatever the browser's timezone.
/// </summary>
public sealed record ShopInfo(
    string Name,
    string? Tagline,
    string? Area,
    ShopPhone Phone,
    string TimeZone,
    string? BookingUrl,
    ShopInfoLocation Location,
    ShopReviews? Reviews
);
