using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Endpoints;

/// <summary>The clock sits at 11:10 shop time (America/New_York) on 2026-10-06; see <c>AvailabilityServiceTests</c>.</summary>
public sealed class BookingEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AvailabilityListsOpenDaysAsIsoDatesWithUtcTimes()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?month=2026-10", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement days = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(4, days.GetArrayLength());
        Assert.Equal("2026-10-06", days[0].GetProperty("date").GetString());
        Assert.Equal("2026-10-06T15:30:00+00:00", days[0].GetProperty("times")[0].GetString());
    }

    [Fact]
    public async Task AvailabilityIsNeverStored()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?month=2026-10", Cancellation);

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("2026-1")]
    [InlineData("2026-10-01")]
    [InlineData("2026-13")]
    [InlineData("10-2026")]
    [InlineData("0001-01")]
    [InlineData("9999-12")]
    public async Task AMalformedMonthIs400ForTheMonth(string month)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync($"/api/bookings/availability?month={month}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.True(problem.GetProperty("errors").TryGetProperty("month", out _));
    }

    [Fact]
    public async Task AMissingMonthIs400()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("2026-09")]
    [InlineData("2027-11")]
    public async Task AMonthOutsideTheBookingWindowIs400WithItsCode(string month)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync($"/api/bookings/availability?month={month}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("outside_booking_window", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ABookingIs201WithOnlyItsIdAndUtcStart()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement confirmation = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(
            [
                "id",
                "startAt",
            ],
            confirmation.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("2026-10-07T13:30:00+00:00", confirmation.GetProperty("startAt").GetString());
    }

    [Fact]
    public async Task ATakenTimeIs409WithItsCode()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        using HttpResponseMessage booked = await client.PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        using HttpResponseMessage response = await client.PostAsJsonAsync("/api/bookings", BookingBody(phone: "+15550100142"), Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("slot_unavailable", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task TheSameAttemptTwiceBooksOnceAndConfirmsBoth()
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        HttpClient client = api.CreateClient();
        Dictionary<string, object?> body = BookingBody();

        using HttpResponseMessage first = await client.PostAsJsonAsync("/api/bookings", body, Cancellation);
        using HttpResponseMessage retried = await client.PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.Created, retried.StatusCode);
        Assert.Equal(await first.Content.ReadAsStringAsync(Cancellation), await retried.Content.ReadAsStringAsync(Cancellation));
        Assert.Single(square.Bookings);
    }

    [Theory]
    [InlineData("name", "J")]
    [InlineData("name", "")]
    [InlineData("name", null)]
    [InlineData("phone", "(555) 010-0187")]
    [InlineData("phone", "5550100187")]
    [InlineData("phone", "+1555010018")]
    [InlineData("phone", "+155501001870")]
    [InlineData("phone", "+445550100187")]
    [InlineData("phone", "+15550100187\n")]
    [InlineData("phone", null)]
    public async Task AnInvalidNameOrPhoneIs400ForThatFieldAndBooksNothing(string field, string? value)
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        Dictionary<string, object?> body = BookingBody();
        body[field] = value;

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal([field], problem.GetProperty("errors").EnumerateObject().Select(error => error.Name.ToLowerInvariant()));
        Assert.Empty(square.Bookings);
    }

    [Theory]
    [InlineData("startAt")]
    [InlineData("idempotencyKey")]
    public async Task AMissingStartOrIdempotencyKeyIs400(string field)
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        Dictionary<string, object?> body = BookingBody();
        body.Remove(field);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(square.Bookings);
    }

    [Fact]
    public async Task BookingWithoutASessionTokenIs401AndBooksNothing()
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(square.Bookings);
    }

    private static Dictionary<string, object?> BookingBody(string phone = "+15550100187") => new()
    {
        ["startAt"] = "2026-10-07T13:30:00Z",
        ["name"] = "Q Testperson-Example",
        ["phone"] = phone,
        ["idempotencyKey"] = Guid.NewGuid(),
    };

    private static ApiFactory Api(FakeSquareService? square = null) => new(
        square: square,
        time: new FakeTimeProvider(DateTimeOffset.Parse("2026-10-06T15:10:00Z", CultureInfo.InvariantCulture))
    );
}
