using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Shop.Mappers;

public static class ShopDtoMapper
{
    public static ShopInfo ToShopInfo(this ShopDetails details, BookingProfile profile, BookableService service) => new(
        details.Name,
        details.Phone,
        details.TimeZone,
        profile.SquareBookingSiteUrl,
        new Address(
            details.Address.Street,
            details.Address.City,
            details.Address.State,
            details.Address.PostalCode
        ),
        string.IsNullOrWhiteSpace(details.Description) ? null : details.Description,
        details.InstagramUsername,
        details.FacebookUrl,
        [.. details.Hours.Select(period => new OpeningHours(
            period.Day,
            period.Opens,
            period.Closes
        ))],
        new BookingSettings(
            (int)profile.MinimumNotice.TotalMinutes,
            (int)profile.MaximumAdvance.TotalDays,
            (int)service.Duration.TotalMinutes,
            profile.CanCustomersCancel
        )
    );
}
