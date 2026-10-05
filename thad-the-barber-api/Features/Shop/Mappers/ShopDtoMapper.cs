using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Shop.Mappers;

public static class ShopDtoMapper
{
    public static ShopInfo ToShopInfo(this ShopLocation location, BookingProfile profile, BookableService service) => new(
        location.Name,
        location.Phone,
        location.TimeZone,
        profile.BookingSiteUrl,
        new Address(
            location.Address.Street,
            location.Address.Locality,
            location.Address.Region,
            location.Address.PostalCode
        ),
        string.IsNullOrWhiteSpace(location.Description) ? null : location.Description,
        location.InstagramUsername,
        location.FacebookUrl,
        [.. location.Hours.Select(period => new OpeningHours(
            period.Day,
            period.Opens,
            period.Closes
        ))],
        new BookingSettings(
            (int)profile.MinNotice.TotalMinutes,
            (int)profile.MaxAdvance.TotalDays,
            (int)service.Duration.TotalMinutes,
            profile.CustomersCanCancel
        )
    );
}
