using System.Net;
using System.Text.Json;
using Square;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.Fakes;

namespace ThadTheBarber.Api.Tests.Square;

/// <summary>What <c>SquareService</c> sends to Square and makes of the recorded answers.</summary>
public sealed class SquareServiceRequestTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ShopDetailsComeFromTheMainLocation()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/locations/main"] = SquareFixture.ReadText("retrieve-location.json");

        ShopDetails details = await harness.Square.GetShopDetailsAsync(Cancellation);

        Assert.Equal("LVF9Q8XN61NA4", details.LocationId);
    }

    [Fact]
    public async Task BookingProfileIncludesTheLocationsBookingSite()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings/business-booking-profile"] = SquareFixture.ReadText("business-booking-profile.json");
        harness.Http.Responses["/v2/bookings/location-booking-profiles"] = SquareFixture.ReadText("location-booking-profiles.json");

        BookingProfile profile = await harness.Square.GetBookingProfileAsync(Cancellation);

        Assert.Equal("https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc", profile.SquareBookingSiteUrl);
    }

    [Fact]
    public async Task AShortDaySearchesTwentyFourHoursAndKeepsOnlyItsOwnSlots()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings/availability/search"] = SquareFixture.ReadText("search-availability.json");
        DateTimeRange range = new(
            new DateTimeOffset(2026, 10, 5, 4, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 6, 3, 0, 0, TimeSpan.Zero)
        );

        List<TimeSlot> slots = await harness.Square.SearchAvailableTimeSlotsAsync("LVF9Q8XN61NA4", new FakeSquareService().BookableService, range, Cancellation);

        JsonElement startAtRange = Body(harness, "/v2/bookings/availability/search").GetProperty("query").GetProperty("filter").GetProperty("start_at_range");
        Assert.Equal("2026-10-05T04:00:00Z", startAtRange.GetProperty("start_at").GetString());
        Assert.Equal("2026-10-06T04:00:00Z", startAtRange.GetProperty("end_at").GetString());
        Assert.Equal(16, slots.Count);
        Assert.All(slots, slot => Assert.InRange(slot.StartAt, range.Start, range.End));
    }

    [Fact]
    public async Task CustomerSearchMatchesThePhoneExactlyOldestFirst()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/customers/search"] = SquareFixture.ReadText("search-customers-by-phone.json");

        string? customerId = await harness.Square.FindCustomerIdAsync("+18045550123", Cancellation);

        JsonElement query = Body(harness, "/v2/customers/search").GetProperty("query");
        Assert.Equal("+18045550123", query.GetProperty("filter").GetProperty("phone_number").GetProperty("exact").GetString());
        Assert.Equal("CREATED_AT", query.GetProperty("sort").GetProperty("field").GetString());
        Assert.Equal("ASC", query.GetProperty("sort").GetProperty("order").GetString());
        Assert.Equal("X0ZH4DE1DVN5P1261RKAE8JPDM", customerId);
    }

    [Theory]
    [InlineData("Spike TwentyOne", "Spike", "TwentyOne")]
    [InlineData("  Mary Ann  Smith ", "Mary", "Ann  Smith")]
    [InlineData("Cher", "Cher", null)]
    public async Task ANewCustomersNameSplitsAtTheFirstSpace(string name, string givenName, string? familyName)
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/customers"] = SquareFixture.ReadText("create-customer.json");

        string customerId = await harness.Square.CreateCustomerAsync(name, "+18045550123", Cancellation);

        JsonElement body = Body(harness, "/v2/customers");
        Assert.Equal(givenName, body.GetProperty("given_name").GetString());
        Assert.Equal(familyName, body.TryGetProperty("family_name", out JsonElement family) ? family.GetString() : null);
        Assert.Equal("KCAYNMXV36K477WJYDVANJSVVG", customerId);
    }

    [Fact]
    public async Task ABookingSendsTheSlotAndTheCallersIdempotencyKey()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings"] = SquareFixture.ReadText("create-booking.json");
        TimeSlot slot = new FakeSquareService().TimeSlots[0];

        Appointment appointment = await harness.Square.CreateBookingAsync("CUSTOMER-1", slot, "key-1", Cancellation);

        JsonElement body = Body(harness, "/v2/bookings");
        JsonElement booking = body.GetProperty("booking");
        JsonElement segment = booking.GetProperty("appointment_segments").EnumerateArray().Single();
        Assert.Equal("key-1", body.GetProperty("idempotency_key").GetString());
        Assert.Equal("CUSTOMER-1", booking.GetProperty("customer_id").GetString());
        Assert.Equal("LVF9Q8XN61NA4", booking.GetProperty("location_id").GetString());
        Assert.Equal("2026-10-05T13:00:00Z", booking.GetProperty("start_at").GetString());
        Assert.Equal("TMN76Ik4Cpv-ToYe", segment.GetProperty("team_member_id").GetString());
        Assert.Equal("TC6VHEWA3WPRAXH6HDMQ5DJN", segment.GetProperty("service_variation_id").GetString());
        Assert.Equal(1791077615792, segment.GetProperty("service_variation_version").GetInt64());
        Assert.Equal("r1h5tfnj3ybo31", appointment.Id);
    }

    [Fact]
    public async Task ARescheduleSendsOnlyTheVersionAndNewStart()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings/r1h5tfnj3ybo31"] = SquareFixture.ReadText("update-booking.json");

        Appointment appointment = await harness.Square.RescheduleBookingAsync(
            "r1h5tfnj3ybo31",
            0,
            new DateTimeOffset(2026, 10, 5, 9, 30, 0, TimeSpan.FromHours(-4)),
            Cancellation);

        JsonElement booking = Body(harness, "/v2/bookings/r1h5tfnj3ybo31").GetProperty("booking");
        Assert.Equal(
            ["start_at", "version"],
            booking.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("2026-10-05T13:30:00Z", booking.GetProperty("start_at").GetString());
        Assert.Equal(1, appointment.Version);
    }

    [Fact]
    public async Task ATakenTimeOnBookingIsASlotUnavailableError()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings"] = SquareFixture.ReadText("error-slot-no-longer-available.json");
        harness.Http.ResponseStatuses["/v2/bookings"] = HttpStatusCode.BadRequest;
        TimeSlot slot = new FakeSquareService().TimeSlots[0];

        await Assert.ThrowsAsync<SlotUnavailableException>(() => harness.Square.CreateBookingAsync("CUSTOMER-1", slot, "key-1", Cancellation));
    }

    [Fact]
    public async Task ATakenTimeOnRescheduleIsASlotUnavailableError()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings/r1h5tfnj3ybo31"] = SquareFixture.ReadText("error-slot-no-longer-available.json");
        harness.Http.ResponseStatuses["/v2/bookings/r1h5tfnj3ybo31"] = HttpStatusCode.BadRequest;

        await Assert.ThrowsAsync<SlotUnavailableException>(() => harness.Square.RescheduleBookingAsync(
            "r1h5tfnj3ybo31",
            0,
            new DateTimeOffset(2026, 10, 5, 13, 30, 0, TimeSpan.Zero),
            Cancellation));
    }

    [Fact]
    public async Task OtherBookingRejectionsStaySquareErrors()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings"] = """{"errors":[{"category":"INVALID_REQUEST_ERROR","code":"INVALID_VALUE","field":"location_id"}]}""";
        harness.Http.ResponseStatuses["/v2/bookings"] = HttpStatusCode.BadRequest;
        TimeSlot slot = new FakeSquareService().TimeSlots[0];

        await Assert.ThrowsAsync<SquareApiException>(() => harness.Square.CreateBookingAsync("CUSTOMER-1", slot, "key-1", Cancellation));
    }

    [Fact]
    public async Task ARejectedPhoneIsAnInvalidCustomerDetailsError()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/customers"] = """{"errors":[{"category":"INVALID_REQUEST_ERROR","code":"INVALID_PHONE_NUMBER","field":"phone_number"}]}""";
        harness.Http.ResponseStatuses["/v2/customers"] = HttpStatusCode.BadRequest;

        await Assert.ThrowsAsync<InvalidCustomerDetailsException>(() => harness.Square.CreateCustomerAsync("Spike TwentyOne", "+1555", Cancellation));
    }

    [Fact]
    public async Task ACancelSendsTheVersion()
    {
        using SquareHarness harness = new();
        harness.Http.Responses["/v2/bookings/r1h5tfnj3ybo31/cancel"] = SquareFixture.ReadText("cancel-booking.json");

        Appointment appointment = await harness.Square.CancelBookingAsync("r1h5tfnj3ybo31", 1, Cancellation);

        Assert.Equal(1, Body(harness, "/v2/bookings/r1h5tfnj3ybo31/cancel").GetProperty("booking_version").GetInt32());
        Assert.Equal(AppointmentStatus.CancelledByCustomer, appointment.Status);
    }

    private static JsonElement Body(SquareHarness harness, string path) =>
        JsonDocument.Parse(harness.Http.Requests.Single(request => request.Path == path).Body).RootElement;
}
