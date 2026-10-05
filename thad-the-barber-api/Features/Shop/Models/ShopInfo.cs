namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// The shop's details from Square. <see cref="Phone"/> is E.164 and <see cref="TimeZone"/> an IANA id: the UI formats
/// the phone, builds its links, and shows every time in that timezone. <see cref="Notice"/> is the location's
/// description (BR-42).
/// </summary>
public sealed record ShopInfo(
    string Name,
    string Phone,
    string TimeZone,
    string? SquareBookingSiteUrl,
    Address Address,
    string? Notice,
    string? InstagramUsername,
    string? FacebookUrl,
    IReadOnlyList<OpeningHours> Hours,
    BookingSettings BookingSettings
);
