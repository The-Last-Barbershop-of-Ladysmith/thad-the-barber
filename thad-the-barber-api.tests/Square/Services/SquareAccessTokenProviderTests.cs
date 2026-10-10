using System.Net;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class SquareAccessTokenProviderTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task FirstUseRenewsWithTheKeyVaultSecretsAndNoBearerToken()
    {
        using SquareHarness harness = new();

        string token = await harness.Tokens.GetAccessTokenAsync(Cancellation);

        Assert.Equal("access-1", token);
        RecordedRequest request = Assert.Single(harness.Http.Requests);
        Assert.Equal("/oauth2/token", request.Path);
        Assert.Null(request.Token);
        Assert.Contains("\"grant_type\":\"refresh_token\"", request.Body);
        Assert.Contains($"\"client_id\":\"{SquareHarness.ApplicationId}\"", request.Body);
        Assert.Contains($"\"client_secret\":\"{SquareHarness.ApplicationSecret}\"", request.Body);
        Assert.Contains($"\"refresh_token\":\"{SquareHarness.RefreshToken}\"", request.Body);
    }

    [Fact]
    public async Task AFreshTokenIsReusedWithoutReadingKeyVaultAgain()
    {
        using SquareHarness harness = new();
        await harness.Tokens.GetAccessTokenAsync(Cancellation);
        int reads = harness.Secrets.Reads;
        harness.Time.Advance(SquareAccessTokenProvider.MaxAge - TimeSpan.FromMinutes(1));

        string token = await harness.Tokens.GetAccessTokenAsync(Cancellation);

        Assert.Equal("access-1", token);
        Assert.Equal(1, harness.Http.TokensIssued);
        Assert.Equal(reads, harness.Secrets.Reads);
    }

    [Fact]
    public async Task ATokenSevenDaysOldIsRenewed()
    {
        using SquareHarness harness = new();
        await harness.Tokens.GetAccessTokenAsync(Cancellation);
        harness.Time.Advance(SquareAccessTokenProvider.MaxAge);

        string token = await harness.Tokens.GetAccessTokenAsync(Cancellation);

        Assert.Equal("access-2", token);
    }

    [Fact]
    public async Task ConcurrentCallersShareOneRenewal()
    {
        using SquareHarness harness = new();

        string[] tokens = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => harness.Tokens.GetAccessTokenAsync(Cancellation)));

        Assert.All(tokens, token => Assert.Equal("access-1", token));
        Assert.Equal(1, harness.Http.TokensIssued);
    }

    [Fact]
    public async Task InvalidatingAnOlderTokenKeepsTheCurrentOne()
    {
        using SquareHarness harness = new();
        await harness.Tokens.GetAccessTokenAsync(Cancellation);

        harness.Tokens.Invalidate("access-0");

        Assert.Equal("access-1", await harness.Tokens.GetAccessTokenAsync(Cancellation));
        Assert.Equal(1, harness.Http.TokensIssued);
    }

    [Fact]
    public async Task AMissingRefreshTokenMeansNotConnected()
    {
        using SquareHarness harness = new(connected: false);

        await Assert.ThrowsAsync<SquareNotConnectedException>(() => harness.Tokens.GetAccessTokenAsync(Cancellation));
        Assert.Empty(harness.Http.Requests);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task ARefusedRefreshTokenMeansNotConnected(HttpStatusCode status)
    {
        using SquareHarness harness = new();
        harness.Http.TokenStatus = status;

        await Assert.ThrowsAsync<SquareNotConnectedException>(() => harness.Tokens.GetAccessTokenAsync(Cancellation));
    }

    [Fact]
    public async Task SecretsAndTokensNeverReachTheLogs()
    {
        using SquareHarness harness = new();
        await harness.Tokens.GetAccessTokenAsync(Cancellation);
        harness.Time.Advance(SquareAccessTokenProvider.MaxAge);
        harness.Http.TokenStatus = HttpStatusCode.Unauthorized;
        await Assert.ThrowsAsync<SquareNotConnectedException>(() => harness.Tokens.GetAccessTokenAsync(Cancellation));

        string logs = string.Join('\n', harness.Logs.GetSnapshot().Select(record => $"{record.Message} {record.Exception}"));

        Assert.NotEmpty(harness.Logs.GetSnapshot());
        Assert.DoesNotContain(SquareHarness.ApplicationSecret, logs);
        Assert.DoesNotContain(SquareHarness.RefreshToken, logs);
        Assert.DoesNotContain("access-1", logs);
    }
}
