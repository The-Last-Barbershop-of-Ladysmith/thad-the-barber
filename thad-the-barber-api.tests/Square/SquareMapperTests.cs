using System.Globalization;
using System.Text.Json;
using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using SquareBooking = Square.Booking;

namespace ThadTheBarber.Api.Tests.Square;

public sealed class SquareMapperTests
{
    [Fact]
    public void LocationBecomesShopLocation()
    {
        ShopLocation location = SquareFixture.Read<GetLocationResponse>("retrieve-location.json").Location!.ToShopLocation();

        Assert.Equal("Thad the Barber", location.Name);
        Assert.Equal("+15406212143", location.Phone);
        Assert.Equal("America/New_York", location.TimeZone);
        Assert.Equal(new ShopAddress("2022 Augustine Ave", "Fredericksburg", "VA", "22401-4419"), location.Address);
        Assert.Equal(
            [
                new ShopHoursPeriod(System.DayOfWeek.Sunday, new TimeOnly(10, 0), new TimeOnly(16, 0)),
                new ShopHoursPeriod(System.DayOfWeek.Saturday, new TimeOnly(10, 0), new TimeOnly(19, 0)),
            ],
            location.Hours);
        Assert.StartsWith("❗Important", location.Description, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("+1 540-621-2143", "+15406212143")]
    [InlineData("(540) 621-2143", "+15406212143")]
    [InlineData("+44 20 7946 0958", "+442079460958")]
    public void LocationPhoneBecomesE164(string squarePhone, string e164)
    {
        Location location = SquareFixture.Read<GetLocationResponse>("retrieve-location.json").Location! with { PhoneNumber = squarePhone };

        Assert.Equal(e164, location.ToShopLocation().Phone);
    }

    [Fact]
    public void BookingProfilesBecomeBookingProfile()
    {
        BusinessBookingProfile business = SquareFixture.Read<GetBusinessBookingProfileResponse>("business-booking-profile.json").BusinessBookingProfile!;
        LocationBookingProfile location = SquareFixture.Read<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single();

        Assert.Equal(
            new BookingProfile(
                BookingEnabled: false,
                MinNotice: TimeSpan.Zero,
                MaxAdvance: TimeSpan.FromDays(365),
                CustomersCanCancel: true,
                BookingSiteUrl: "https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc"),
            business.ToBookingProfile(location));
    }

    [Fact]
    public void AppointmentServiceItemBecomesItsBookableVariations()
    {
        CatalogObject item = SquareFixture.Read<SearchCatalogItemsResponse>("search-catalog-items.json").Items!.Single();

        BookableService service = Assert.Single(item.ToBookableServices());

        Assert.Equal("Men's haircut", service.Name);
        Assert.Equal("TC6VHEWA3WPRAXH6HDMQ5DJN", service.VariationId);
        Assert.Equal(1791077615792, service.VariationVersion);
        Assert.Equal(TimeSpan.FromMinutes(30), service.Duration);
        Assert.Equal(["TMN76Ik4Cpv-ToYe"], service.TeamMemberIds);
    }

    [Theory]
    [InlineData("\"available_for_booking\": true", "\"available_for_booking\": false")]
    [InlineData("\"product_type\": \"APPOINTMENTS_SERVICE\"", "\"product_type\": \"REGULAR\"")]
    [InlineData("\"is_deleted\": false,\n      \"present_at_all_locations\": true,\n      \"item_data\"", "\"is_deleted\": true,\n      \"present_at_all_locations\": true,\n      \"item_data\"")]
    public void ItemsAndVariationsCustomersCantBookAreLeftOut(string squareValue, string replacement)
    {
        string json = SquareFixture.Text("search-catalog-items.json").ReplaceLineEndings("\n");
        Assert.Contains(squareValue, json, StringComparison.Ordinal);

        CatalogObject item = JsonSerializer.Deserialize<SearchCatalogItemsResponse>(json.Replace(squareValue, replacement, StringComparison.Ordinal))!.Items!.Single();

        Assert.Empty(item.ToBookableServices());
    }

    [Fact]
    public void AvailabilityBecomesAvailableSlot()
    {
        Availability availability = SquareFixture.Read<SearchAvailabilityResponse>("search-availability.json").Availabilities!.First();

        Assert.Equal(
            new AvailableSlot(new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero), "TMN76Ik4Cpv-ToYe"),
            availability.ToAvailableSlot());
    }

    [Theory]
    [InlineData("create-booking.json", 0, ShopBookingStatus.Accepted, "2026-10-05T13:00:00Z")]
    [InlineData("update-booking.json", 1, ShopBookingStatus.Accepted, "2026-10-05T13:30:00Z")]
    [InlineData("cancel-booking.json", 2, ShopBookingStatus.CancelledByCustomer, "2026-10-05T13:30:00Z")]
    public void BookingBecomesShopBooking(string fixture, int version, ShopBookingStatus status, string startAt)
    {
        SquareBooking booking = SquareFixture.Read<CreateBookingResponse>(fixture).Booking!;

        Assert.Equal(
            new ShopBooking(
                "r1h5tfnj3ybo31",
                version,
                status,
                DateTimeOffset.Parse(startAt, CultureInfo.InvariantCulture),
                "X0ZH4DE1DVN5P1261RKAE8JPDM"),
            booking.ToShopBooking());
    }
}
