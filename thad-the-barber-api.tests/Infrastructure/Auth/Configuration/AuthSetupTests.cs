using System.Buffers.Text;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Azure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Infrastructure.Auth.Configuration;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Infrastructure.Auth.Configuration;

public sealed class AuthSetupTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    // The factory runs on the real clock, and only ranges inside the booking window return 200.
    private static readonly string ProtectedPath = string.Create(
        CultureInfo.InvariantCulture,
        $"/api/bookings/availability?from={DateTime.UtcNow:yyyy-MM-dd}&to={DateTime.UtcNow.AddDays(30):yyyy-MM-dd}"
    );

    private static readonly string[] exemptRoutes = ["/api/health", "/api/session", "/api/shop", "/api/webhooks/square"];

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AProtectedEndpointWithoutATokenIs401()
    {
        using HttpResponseMessage response = await factory.CreateClientWithoutToken().GetAsync(ProtectedPath, Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AProtectedEndpointWithAValidTokenWorks()
    {
        using HttpResponseMessage response = await GetProtectedWithTokenAsync(SessionTokens.Create(factory.SigningKey.Key));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("wrong audience")]
    [InlineData("wrong issuer")]
    [InlineData("other key")]
    [InlineData("unsigned")]
    [InlineData("HS256")]
    [InlineData("tampered")]
    [InlineData("not a JWT")]
    public async Task AnExpiredMisaddressedForeignOrTamperedTokenIs401(string kind)
    {
        using HttpResponseMessage response = await GetProtectedWithTokenAsync(CreateRefusedToken(kind));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/health?deep=true")]
    [InlineData("/api/shop")]
    public async Task HealthAndTheShopNeedNoToken(string path)
    {
        using HttpResponseMessage response = await factory.CreateClientWithoutToken().GetAsync(path, Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public void OnlyHealthSessionShopAndTheSquareWebhookAreOpenWithoutAToken()
    {
        string[] openRoutes =
        [
            .. factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
                .OfType<RouteEndpoint>()
                .Where(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>() is null
                    || endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
                .Select(endpoint => $"/{endpoint.RoutePattern.RawText!.TrimStart('/')}")
                .Order(StringComparer.Ordinal),
        ];

        Assert.Equal(exemptRoutes, openRoutes);
    }

    [Fact]
    public async Task AnUnknownPathIs404NotA401()
    {
        using HttpResponseMessage response = await factory.CreateClientWithoutToken().GetAsync("/api/no-such-thing", Cancellation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public void StartupFailsWhenTheSigningKeyCantBeRead()
    {
        using ServiceProvider services = new ServiceCollection()
            .AddLogging()
            .AddSingleton(new FakeKeyClient("session-key") { FailWith = 403 })
            .AddSingleton<ISessionSigningKey>(provider => new KeyVaultSessionSigningKey(
                provider.GetRequiredService<FakeKeyClient>(),
                Options.Create(new SessionSettings
                {
                    SigningKeyName = "session-key",
                })
            ))
            .AddSessionBearerAuth()
            .BuildServiceProvider();

        Assert.Throws<RequestFailedException>(() => services.GetRequiredService<IStartupValidator>().Validate());
    }

    // Browsers never send Authorization on a preflight, so CORS must answer it before authorization runs.
    [Fact]
    public async Task APreflightToAProtectedEndpointNeedsNoToken()
    {
        using HttpRequestMessage request = new(HttpMethod.Options, ProtectedPath);
        request.Headers.Add("Origin", ApiFactory.FrontendOrigin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");

        using HttpResponseMessage response = await factory.CreateClientWithoutToken().SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private string CreateRefusedToken(string kind)
    {
        SecurityKey key = factory.SigningKey.Key;
        switch (kind)
        {
            case "expired":
                return SessionTokens.Create(key, expires: DateTime.UtcNow.AddMinutes(-1));
            case "wrong audience":
                return SessionTokens.Create(key, audience: "another-api");
            case "wrong issuer":
                return SessionTokens.Create(key, issuer: "someone-else");
            case "other key":
                return SessionTokens.Create(new FakeSessionSigningKey().Key);
            case "unsigned":
                return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
                {
                    Issuer = "ttb-api",
                    Audience = "ttb-api",
                });
            case "HS256":
                return SessionTokens.Create(new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(32)), algorithm: SecurityAlgorithms.HmacSha256);
            case "tampered":
                return Tamper(SessionTokens.Create(key));
            case "not a JWT":
                return "not-a-jwt";
            default:
                throw new ArgumentOutOfRangeException(nameof(kind), kind, "No such refused token.");
        }
    }

    /// <summary>Swaps the payload for one with a different subject, keeping the original signature.</summary>
    private static string Tamper(string token)
    {
        string[] parts = token.Split('.');
        string payload = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(parts[1]));
        parts[1] = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(payload.Replace("session-1", "session-2", StringComparison.Ordinal)));
        return string.Join('.', parts);
    }

    private async Task<HttpResponseMessage> GetProtectedWithTokenAsync(string token)
    {
        HttpClient client = factory.CreateClientWithoutToken();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.GetAsync(ProtectedPath, Cancellation);
    }
}
