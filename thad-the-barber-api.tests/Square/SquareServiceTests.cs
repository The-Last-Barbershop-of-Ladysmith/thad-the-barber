using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Tests.Square;

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
    public async Task UnreachableWhenSquareIsDown()
    {
        using SquareHarness harness = new();
        harness.Http.Down = true;

        Assert.Equal(SquareConnection.Unreachable, await harness.Square.CheckConnectionAsync(Cancellation));
    }
}
