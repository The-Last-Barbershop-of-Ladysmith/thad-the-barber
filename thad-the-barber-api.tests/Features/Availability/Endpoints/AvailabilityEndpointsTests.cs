using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.Availability.Endpoints;

/// <summary>The clock sits at 11:10 shop time (America/New_York) on 2026-10-06; see <c>AvailabilityServiceTests</c>.</summary>
public sealed class AvailabilityEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task DatesListsTheMonthsOpenDaysAsIsoDates()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/availability/dates?month=2026-10", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            [
                "2026-10-06",
                "2026-10-07",
                "2026-10-08",
                "2026-10-09",
            ],
            (await response.Content.ReadFromJsonAsync<string[]>(Cancellation))!);
    }

    [Fact]
    public async Task TimesListsTheDaysOpenTimesAsUtcInstants()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/availability/times?date=2026-10-09", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string[] times = (await response.Content.ReadFromJsonAsync<string[]>(Cancellation))!;
        Assert.Equal(16, times.Length);
        Assert.Equal("2026-10-09T13:00:00+00:00", times[0]);
    }

    [Theory]
    [InlineData("/api/availability/dates?month=2026-10")]
    [InlineData("/api/availability/times?date=2026-10-09")]
    public async Task AvailabilityIsNeverStored(string path)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync(path, Cancellation);

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("/api/availability/dates?month=2026-1", "month")]
    [InlineData("/api/availability/dates?month=2026-10-01", "month")]
    [InlineData("/api/availability/dates?month=2026-13", "month")]
    [InlineData("/api/availability/times?date=10/09/2026", "date")]
    [InlineData("/api/availability/times?date=2026-02-30", "date")]
    public async Task AMalformedMonthOrDateIs400ForThatParameter(string path, string parameter)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync(path, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.True(problem.GetProperty("errors").TryGetProperty(parameter, out _));
    }

    [Theory]
    [InlineData("/api/availability/dates")]
    [InlineData("/api/availability/times")]
    public async Task AMissingMonthOrDateIs400(string path)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync(path, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/availability/dates?month=2026-09")]
    [InlineData("/api/availability/times?date=2026-10-05")]
    [InlineData("/api/availability/times?date=2027-10-07")]
    public async Task OutsideTheBookingWindowIs400WithItsCode(string path)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync(path, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("outside_booking_window", problem.GetProperty("code").GetString());
    }

    private static ApiFactory Api() =>
        new(time: new FakeTimeProvider(DateTimeOffset.Parse("2026-10-06T15:10:00Z", CultureInfo.InvariantCulture)));
}
