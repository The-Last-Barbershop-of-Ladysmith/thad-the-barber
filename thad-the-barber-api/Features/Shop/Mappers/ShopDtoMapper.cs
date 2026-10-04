using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Shop.Mappers;

public static class ShopDtoMapper
{
    public static ShopInfo ToShopInfo(this ShopLocation location, BookingProfile profile)
    {
        ShopAddress address = location.Address;
        string cityLine = $"{address.Locality}, {address.Region} {address.PostalCode.Split('-')[0]}";
        string mapQuery = Uri.EscapeDataString($"{address.Street}, {cityLine}");
        return new ShopInfo(
            location.Name,
            Tagline: null,
            Area: null,
            new ShopPhone(
                ToDisplayPhone(location.Phone),
                location.Phone
            ),
            location.TimeZone,
            profile.BookingSiteUrl,
            new ShopInfoLocation(
                Venue: null,
                address.Street,
                cityLine,
                $"https://maps.google.com/maps?q={mapQuery}&z=14&output=embed",
                $"https://www.google.com/maps/dir/?api=1&destination={mapQuery}"
            ),
            Reviews: null
        );
    }

    public static OpeningHours ToOpeningHours(this ShopHoursPeriod period) => new(
        (int)period.Day,
        (int)period.Opens.ToTimeSpan().TotalMinutes,
        (int)period.Closes.ToTimeSpan().TotalMinutes
    );

    public static BookingRules ToBookingRules(this BookingProfile profile, BookableService service) => new(
        (int)profile.MaxAdvance.TotalDays,
        (int)service.Duration.TotalMinutes
    );

    /// <summary>US numbers read as "(540) 621-2143"; others stay in E.164.</summary>
    private static string ToDisplayPhone(string e164) =>
        e164 is ['+', '1', .. { Length: 10 } national]
            ? $"({national[..3]}) {national[3..6]}-{national[6..]}"
            : e164;
}
