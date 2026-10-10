using System.Text.Json.Nodes;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Shop.Mappers;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Tests.TestSupport;
using Address = ThadTheBarber.Api.Features.Shop.Models.Address;
using DayOfWeek = System.DayOfWeek;

namespace ThadTheBarber.Api.Tests.Features.Shop.Mappers;

public sealed class ShopDtoMapperTests
{
    private readonly FakeSquareService _square = new();

    [Fact]
    public void DetailsProfileAndServiceBecomeShopInfo()
    {
        ShopInfo shop = _square.ShopDetails.ToShopInfo(_square.BookingProfile, _square.BookableServices.Single());

        Assert.Equal("O'Neil & Søn Barbershop", shop.Name);
        Assert.Equal("+15550100199", shop.Phone);
        Assert.Equal("America/New_York", shop.TimeZone);
        Assert.Equal("https://square.site/book/LOCATION0TEST/test-shop", shop.SquareBookingSiteUrl);
        Assert.Equal(
            new Address(
                "100 Example St Ste #2",
                "Winston-Salem",
                "NC",
                "27101-0001"
            ),
            shop.Address);
        Assert.Equal("❗Important: read before booking❗\n\nQuestions? Text 555-010-0199.\n\nPrices stay the same for now 💈\n", shop.Notice);
        Assert.Null(shop.InstagramUsername);
        Assert.Null(shop.FacebookUrl);
        Assert.Equal(
            [
                new OpeningHours(
                    DayOfWeek.Saturday,
                    new TimeOnly(9, 30),
                    new TimeOnly(12, 0)
                ),
                new OpeningHours(
                    DayOfWeek.Sunday,
                    new TimeOnly(10, 0),
                    new TimeOnly(16, 0)
                ),
                new OpeningHours(
                    DayOfWeek.Saturday,
                    new TimeOnly(13, 0),
                    new TimeOnly(19, 45)
                ),
            ],
            shop.Hours);
        Assert.Equal(
            new BookingSettings(
                MinNoticeMinutes: 0,
                MaxAdvanceDays: 365,
                SlotMinutes: 30,
                CanCustomersCancel: true
            ),
            shop.BookingSettings);
    }

    [Fact]
    public void HoursGoOutAsDayNumbersAndTimeStrings()
    {
        using ApiFactory api = new();
        JsonSerializerOptions json = api.Services.GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions;

        JsonNode hours = JsonSerializer.SerializeToNode(_square.ShopDetails.ToShopInfo(_square.BookingProfile, _square.BookableServices.Single()), json)!["hours"]![2]!;

        Assert.Equal("""{"day":6,"opens":"13:00:00","closes":"19:45:00"}""", hours.ToJsonString());
    }
}
