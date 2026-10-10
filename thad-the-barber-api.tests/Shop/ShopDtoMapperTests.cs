using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Shop.Mappers;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Tests.Fakes;
using Address = ThadTheBarber.Api.Features.Shop.Models.Address;
using DayOfWeek = System.DayOfWeek;

namespace ThadTheBarber.Api.Tests.Shop;

public sealed class ShopDtoMapperTests
{
    private readonly FakeSquareService _square = new();

    [Fact]
    public void DetailsProfileAndServiceBecomeShopInfo()
    {
        ShopInfo shop = _square.ShopDetails.ToShopInfo(_square.BookingProfile, _square.BookableServices.Single());

        Assert.Equal("Thad the Barber", shop.Name);
        Assert.Equal("+15406212143", shop.Phone);
        Assert.Equal("America/New_York", shop.TimeZone);
        Assert.Equal("https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc", shop.SquareBookingSiteUrl);
        Assert.Equal(
            new Address(
                "2022 Augustine Ave",
                "Fredericksburg",
                "VA",
                "22401-4419"
            ),
            shop.Address);
        Assert.StartsWith("❗Important", shop.Notice, StringComparison.Ordinal);
        Assert.Null(shop.InstagramUsername);
        Assert.Null(shop.FacebookUrl);
        Assert.Equal(
            [
                new OpeningHours(
                    DayOfWeek.Sunday,
                    new TimeOnly(10, 0),
                    new TimeOnly(16, 0)
                ),
                new OpeningHours(
                    DayOfWeek.Saturday,
                    new TimeOnly(10, 0),
                    new TimeOnly(19, 0)
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

        JsonNode hours = JsonSerializer.SerializeToNode(_square.ShopDetails.ToShopInfo(_square.BookingProfile, _square.BookableServices.Single()), json)!["hours"]![1]!;

        Assert.Equal("""{"day":6,"opens":"10:00:00","closes":"19:00:00"}""", hours.ToJsonString());
    }
}
