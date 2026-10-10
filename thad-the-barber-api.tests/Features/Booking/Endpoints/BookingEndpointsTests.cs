using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Tests.TestSupport;

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

    private static ApiFactory Api() =>
        new(time: new FakeTimeProvider(DateTimeOffset.Parse("2026-10-06T15:10:00Z", CultureInfo.InvariantCulture)));
}
