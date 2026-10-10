using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Shop.Endpoints;

public sealed class ShopEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ShopReturnsTheLocationBookingProfileAndServiceLength()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/shop", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("+15550100199", body.GetProperty("phone").GetString());
        Assert.Equal("America/New_York", body.GetProperty("timeZone").GetString());
        Assert.Equal(3, body.GetProperty("hours").GetArrayLength());
        Assert.Equal(365, body.GetProperty("bookingSettings").GetProperty("maxAdvanceDays").GetInt32());
        Assert.Equal(30, body.GetProperty("bookingSettings").GetProperty("slotMinutes").GetInt32());
    }

    [Fact]
    public async Task ASecondCallWithinTheHourDoesntCallSquare()
    {
        FakeSquareService square = new();
        using ApiFactory api = new(square: square);
        using HttpClient client = api.CreateClient();

        await client.GetAsync("/api/shop", Cancellation);
        await client.GetAsync("/api/shop", Cancellation);

        Assert.Equal(1, square.ShopDetailsReads);
        Assert.Equal(1, square.BookingProfileReads);
        Assert.Equal(1, square.CatalogSearches);
    }

    [Fact]
    public async Task WhenSquareFailsAfterASuccessfulCallTheLastCopyIsServed()
    {
        FakeSquareService square = new();
        FakeTimeProvider time = new();
        using ApiFactory api = new(square: square);
        using WebApplicationFactory<Program> timed = api.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services => services.AddSingleton<TimeProvider>(time)));
        using HttpClient client = timed.CreateClient();
        string fresh = await client.GetStringAsync("/api/shop", Cancellation);
        time.Advance(CachingSquareService.CacheFor);
        square.Failure = new HttpRequestException("Square is down.");

        using HttpResponseMessage response = await client.GetAsync("/api/shop", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(fresh, await response.Content.ReadAsStringAsync(Cancellation));
        Assert.Equal(2, square.ShopDetailsReads);
    }

    [Fact]
    public async Task ShopIs503WhenSquareIsDownAndNothingIsCached()
    {
        using ApiFactory api = new(square: new FakeSquareService
        {
            Failure = new HttpRequestException("Square is down."),
        });

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/shop", Cancellation);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task ShopIs503WhenTheCatalogHasSeveralBookableServices()
    {
        using ApiFactory api = new(square: new FakeSquareService
        {
            BookableServices = FakeSquareService.TwoBookableServices,
        });

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/shop", Cancellation);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}
