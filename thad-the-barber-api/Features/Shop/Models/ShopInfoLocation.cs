namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary><see cref="Venue"/> (the salon Thad cuts in) isn't in Square; it stays null until the content file (#25).</summary>
public sealed record ShopInfoLocation(
    string? Venue,
    string Street,
    string CityLine,
    string MapEmbedUrl,
    string DirectionsUrl);
