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
    public void LocationBecomesShopDetails()
    {
        ShopDetails details = SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location!.ToShopDetails();

        Assert.Equal("LVF9Q8XN61NA4", details.LocationId);
        Assert.Equal("Thad the Barber", details.Name);
        Assert.Equal("+15406212143", details.Phone);
        Assert.Equal("America/New_York", details.TimeZone);
        Assert.Equal(
            new ShopAddress(
                "2022 Augustine Ave",
                "Fredericksburg",
                "VA",
                "22401-4419"
            ),
            details.Address);
        Assert.Equal(
            [
                new OpeningPeriod(
                    System.DayOfWeek.Sunday,
                    new TimeOnly(10, 0),
                    new TimeOnly(16, 0)
                ),
                new OpeningPeriod(
                    System.DayOfWeek.Saturday,
                    new TimeOnly(10, 0),
                    new TimeOnly(19, 0)
                ),
            ],
            details.Hours);
        Assert.StartsWith("❗Important", details.Description, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("+1 540-621-2143", "+15406212143")]
    [InlineData("(540) 621-2143", "+15406212143")]
    [InlineData("+44 20 7946 0958", "+442079460958")]
    public void LocationPhoneBecomesE164(string squarePhone, string e164)
    {
        Location location = SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location! with { PhoneNumber = squarePhone };

        Assert.Equal(e164, location.ToShopDetails().Phone);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  \n")]
    public void ABlankDescriptionMeansNone(string description)
    {
        Location location = SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location! with { Description = description };

        Assert.Null(location.ToShopDetails().Description);
    }

    [Fact]
    public void BookingProfilesBecomeBookingProfile()
    {
        BusinessBookingProfile business = SquareFixture.ReadAs<GetBusinessBookingProfileResponse>("business-booking-profile.json").BusinessBookingProfile!;
        LocationBookingProfile location = SquareFixture.ReadAs<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single();

        Assert.Equal(
            new BookingProfile(
                IsOnlineBookingEnabled: true,
                MinimumNotice: TimeSpan.Zero,
                MaximumAdvance: TimeSpan.FromDays(365),
                CanCustomersCancel: true,
                SquareBookingSiteUrl: "https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc"
            ),
            business.ToBookingProfile(location));
    }

    [Fact]
    public void AppointmentServiceItemBecomesItsBookableVariations()
    {
        CatalogObject item = SquareFixture.ReadAs<SearchCatalogItemsResponse>("search-catalog-items.json").Items!.Single();

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
        string json = SquareFixture.ReadText("search-catalog-items.json").ReplaceLineEndings("\n");
        Assert.Contains(squareValue, json, StringComparison.Ordinal);

        CatalogObject item = JsonSerializer.Deserialize<SearchCatalogItemsResponse>(json.Replace(squareValue, replacement, StringComparison.Ordinal))!.Items!.Single();

        Assert.Empty(item.ToBookableServices());
    }

    [Fact]
    public void AvailabilityBecomesTimeSlot()
    {
        Availability availability = SquareFixture.ReadAs<SearchAvailabilityResponse>("search-availability.json").Availabilities!.First();

        Assert.Equal(
            new TimeSlot(
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                "LVF9Q8XN61NA4",
                "TMN76Ik4Cpv-ToYe",
                "TC6VHEWA3WPRAXH6HDMQ5DJN",
                1791077615792
            ),
            availability.ToTimeSlot());
    }

    [Theory]
    [InlineData("create-booking.json", 0, AppointmentStatus.Accepted, "2026-10-05T13:00:00Z")]
    [InlineData("update-booking.json", 1, AppointmentStatus.Accepted, "2026-10-05T13:30:00Z")]
    [InlineData("cancel-booking.json", 2, AppointmentStatus.CancelledByCustomer, "2026-10-05T13:30:00Z")]
    public void BookingBecomesAppointment(string fixture, int version, AppointmentStatus status, string startAt)
    {
        SquareBooking booking = SquareFixture.ReadAs<CreateBookingResponse>(fixture).Booking!;

        Assert.Equal(
            new Appointment(
                "r1h5tfnj3ybo31",
                version,
                status,
                DateTimeOffset.Parse(startAt, CultureInfo.InvariantCulture)
            ),
            booking.ToAppointment());
    }

    [Fact]
    public void TimesWithAnOffsetBecomeUtc()
    {
        SquareBooking booking = SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking! with { StartAt = "2026-10-05T09:00:00-04:00" };
        Availability availability = SquareFixture.ReadAs<SearchAvailabilityResponse>("search-availability.json").Availabilities!.First() with { StartAt = "2026-10-05T09:00:00-04:00" };

        Assert.Equal(TimeSpan.Zero, booking.ToAppointment().StartAt.Offset);
        Assert.Equal(TimeSpan.Zero, availability.ToTimeSlot().StartAt.Offset);
    }
}
