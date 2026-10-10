using Microsoft.AspNetCore.Http;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class SquareServiceTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ConnectedWhenSquareAcceptsTheToken()
    {
        using SquareHarness harness = new();

        Assert.Equal(SquareConnection.Connected, await harness.Square.CheckConnectionAsync(Cancellation));
        Assert.Equal("access-1", harness.Http.Requests.Single(request => request.Path == "/oauth2/token/status").Token);
    }

    [Fact]
    public async Task ARejectedTokenIsRenewedAndTheCallRetriedOnce()
    {
        using SquareHarness harness = new();
        harness.Http.RejectedTokens.Add("access-1");

        SquareConnection connection = await harness.Square.CheckConnectionAsync(Cancellation);

        Assert.Equal(SquareConnection.Connected, connection);
        Assert.Equal(
            ["/oauth2/token", "/oauth2/token/status", "/oauth2/token", "/oauth2/token/status"],
            harness.Http.Requests.Select(request => request.Path));
        Assert.Equal("access-2", harness.Http.Requests[^1].Token);
    }

    [Fact]
    public async Task NotConnectedWhenSquareRejectsTheRenewedTokenToo()
    {
        using SquareHarness harness = new();
        harness.Http.RejectedTokens.UnionWith(["access-1", "access-2"]);

        Assert.Equal(SquareConnection.NotConnected, await harness.Square.CheckConnectionAsync(Cancellation));
        Assert.Equal(2, harness.Http.TokensIssued);
    }

    [Fact]
    public async Task NotConnectedWithoutARefreshToken()
    {
        using SquareHarness harness = new(connected: false);

        Assert.Equal(SquareConnection.NotConnected, await harness.Square.CheckConnectionAsync(Cancellation));
    }

    [Fact]
    public async Task UnreachableWhenKeyVaultRefusesTheRead()
    {
        using SquareHarness harness = new();
        harness.Secrets.FailWith = StatusCodes.Status403Forbidden;

        Assert.Equal(SquareConnection.Unreachable, await harness.Square.CheckConnectionAsync(Cancellation));
    }

    [Fact]
    public async Task UnreachableWhenSquareIsDown()
    {
        using SquareHarness harness = new();
        harness.Http.Down = true;

        Assert.Equal(SquareConnection.Unreachable, await harness.Square.CheckConnectionAsync(Cancellation));
    }

    [Fact]
    public async Task ShopDetailsBookingProfileAndServicesAreReadFromSquareOnceWithinTheCacheTime()
    {
        using SquareHarness harness = WithShopResponses();

        await ReadShopAsync(harness);
        harness.Time.Advance(SquareCache.CacheFor - TimeSpan.FromSeconds(1));
        await ReadShopAsync(harness);

        Assert.Equal(
            [
                "/v2/bookings/business-booking-profile",
                "/v2/bookings/location-booking-profiles",
                "/v2/catalog/search-catalog-items",
                "/v2/locations/main",
            ],
            harness.Http.Requests.Select(request => request.Path).Where(path => path != "/oauth2/token").Order());
    }

    [Fact]
    public async Task WhenSquareIsDownTheLastShopDetailsAreServed()
    {
        using SquareHarness harness = WithShopResponses();
        ShopDetails fetched = await harness.Square.GetShopDetailsAsync(Cancellation);
        harness.Time.Advance(SquareCache.CacheFor);
        harness.Http.Down = true;

        ShopDetails served = await harness.Square.GetShopDetailsAsync(Cancellation);

        Assert.Same(fetched, served);
    }

    private static SquareHarness WithShopResponses()
    {
        SquareHarness harness = new();
        harness.Http.Responses["/v2/locations/main"] = SquareFixture.ReadText("retrieve-location.json");
        harness.Http.Responses["/v2/bookings/business-booking-profile"] = SquareFixture.ReadText("business-booking-profile.json");
        harness.Http.Responses["/v2/bookings/location-booking-profiles"] = SquareFixture.ReadText("location-booking-profiles.json");
        harness.Http.Responses["/v2/catalog/search-catalog-items"] = SquareFixture.ReadText("search-catalog-items.json");
        return harness;
    }

    private static async Task ReadShopAsync(SquareHarness harness)
    {
        await harness.Square.GetShopDetailsAsync(Cancellation);
        await harness.Square.GetBookingProfileAsync("LOCATION0TEST", Cancellation);
        await harness.Square.GetBookableServicesAsync(Cancellation);
    }
}
