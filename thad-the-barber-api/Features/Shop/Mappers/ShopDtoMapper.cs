using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Features.Shop.Mappers;

public static class ShopDtoMapper
{
    public static ShopInfo ToShopInfo(this ShopDetails shopDetails, BookingProfile bookingProfile, BookableService bookableService)
    {
        string? notice = null;
        if (!string.IsNullOrWhiteSpace(shopDetails.Description))
        {
            notice = shopDetails.Description;
        }

        return new ShopInfo(
            shopDetails.Name,
            shopDetails.Phone,
            shopDetails.TimeZone,
            bookingProfile.SquareBookingSiteUrl,
            new Address(
                shopDetails.Address.Street,
                shopDetails.Address.City,
                shopDetails.Address.State,
                shopDetails.Address.PostalCode
            ),
            notice,
            shopDetails.InstagramUsername,
            shopDetails.FacebookUrl,
            [.. shopDetails.Hours.Select(openingPeriod => new OpeningHours(
                openingPeriod.Day,
                openingPeriod.Opens,
                openingPeriod.Closes
            ))],
            new BookingSettings(
                (int)bookingProfile.MinimumNotice.TotalMinutes,
                (int)bookingProfile.MaximumAdvance.TotalDays,
                (int)bookableService.Duration.TotalMinutes,
                bookingProfile.CanCustomersCancel
            )
        );
    }
}
