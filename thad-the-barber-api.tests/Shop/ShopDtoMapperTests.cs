using Square;
using ThadTheBarber.Api.Features.Shop.Mappers;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.Square;

namespace ThadTheBarber.Api.Tests.Shop;

public sealed class ShopDtoMapperTests
{
    private static ShopLocation Location =>
        SquareFixture.Read<GetLocationResponse>("retrieve-location.json").Location!.ToShopLocation();

    private static BookingProfile Profile => SquareFixture.Read<GetBusinessBookingProfileResponse>("business-booking-profile.json")
        .BusinessBookingProfile!
        .ToBookingProfile(SquareFixture.Read<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single());

    private static BookableService Service => SquareFixture.Read<SearchCatalogItemsResponse>("search-catalog-items.json")
        .Items!
        .Single()
        .ToBookableServices()
        .Single();

    [Fact]
    public void LocationAndProfileBecomeShopInfo()
    {
        const string mapQuery = "2022%20Augustine%20Ave%2C%20Fredericksburg%2C%20VA%2022401";

        Assert.Equal(
            new ShopInfo(
                "Thad the Barber",
                Tagline: null,
                Area: null,
                new ShopPhone(
                    "(540) 621-2143",
                    "tel:+15406212143",
                    "sms:+15406212143"
                ),
                "https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc",
                new ShopInfoLocation(
                    Venue: null,
                    "2022 Augustine Ave",
                    "Fredericksburg, VA 22401",
                    $"https://maps.google.com/maps?q={mapQuery}&z=14&output=embed",
                    $"https://www.google.com/maps/dir/?api=1&destination={mapQuery}"
                ),
                Reviews: null
            ),
            Location.ToShopInfo(Profile));
    }

    [Fact]
    public void PhonesOutsideTheUsStayInE164()
    {
        ShopLocation location = Location with { Phone = "+442079460958" };

        Assert.Equal(
            new ShopPhone(
                "+442079460958",
                "tel:+442079460958",
                "sms:+442079460958"
            ),
            location.ToShopInfo(Profile).Phone);
    }

    [Fact]
    public void BusinessHoursBecomeOpeningHours()
    {
        Assert.Equal(
            [
                new OpeningHours(
                    0,
                    10 * 60,
                    16 * 60
                ),
                new OpeningHours(
                    6,
                    10 * 60,
                    19 * 60
                ),
            ],
            Location.Hours.Select(period => period.ToOpeningHours()));
    }

    [Fact]
    public void ProfileAndServiceBecomeBookingRules()
    {
        Assert.Equal(
            new BookingRules(
                365,
                30
            ),
            Profile.ToBookingRules(Service));
    }
}
