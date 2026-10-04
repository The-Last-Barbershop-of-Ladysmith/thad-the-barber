using System.Net;
using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Infrastructure.Cors.Configuration;

namespace ThadTheBarber.Api.Tests;

public sealed class CorsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData(ApiFactory.FrontendOrigin)]
    [InlineData(ApiFactory.CustomDomainOrigin)]
    public async Task PreflightFromAnAllowedOriginSucceeds(string origin)
    {
        using HttpResponseMessage response = await SendPreflightAsync(origin, "GET", "authorization,content-type,x-manage-token,traceparent,tracestate");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(origin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
    }

    [Fact]
    public async Task PreflightFromAnotherOriginGetsNoAllowOrigin()
    {
        using HttpResponseMessage response = await SendPreflightAsync("https://evil.example", "GET", "authorization");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task RequestFromAnotherOriginGetsNoAllowOrigin()
    {
        using HttpRequestMessage request = new(HttpMethod.Get, "/api/health");
        request.Headers.Add("Origin", "https://evil.example");

        using HttpResponseMessage response = await factory.CreateClient().SendAsync(request, TestContext.Current.CancellationToken);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    // The middleware answers the preflight with the policy's lists; the browser blocks anything not on them.
    [Fact]
    public async Task PreflightOffersOnlyThePolicyMethodsAndHeaders()
    {
        using HttpResponseMessage response = await SendPreflightAsync(ApiFactory.FrontendOrigin, "DELETE", "x-not-allowed");

        Assert.Equal(["GET", "POST"], SplitHeader(response, "Access-Control-Allow-Methods"));
        Assert.Equal(
            ["Authorization", "Content-Type", "X-Manage-Token", "traceparent", "tracestate"],
            SplitHeader(response, "Access-Control-Allow-Headers"));
    }

    private static string[] SplitHeader(HttpResponseMessage response, string name) =>
        [.. response.Headers.GetValues(name).SelectMany(value => value.Split(',', StringSplitOptions.TrimEntries))];

    [Theory]
    [InlineData("")]
    [InlineData("*")]
    [InlineData(ApiFactory.FrontendOrigin + ",https://*.example.com")]
    [InlineData("https://example.com/")]
    [InlineData("example.com")]
    public void StartupFailsOnAnEmptyWildcardOrMalformedOriginList(string commaSeparatedOrigins)
    {
        // Runs the validation the host runs on start (IStartupValidator) without starting a host: when a
        // WebApplicationFactory host fails to start, Program's RunAsync disposes the services while the factory still
        // uses them, so the test sometimes saw ObjectDisposedException instead.
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(commaSeparatedOrigins
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select((origin, i) => KeyValuePair.Create<string, string?>($"Cors:AllowedOrigins:{i}", origin)))
            .Build();
        using ServiceProvider services = new ServiceCollection()
            .AddFrontendCors(configuration)
            .BuildServiceProvider();

        Assert.Throws<OptionsValidationException>(() => services.GetRequiredService<IStartupValidator>().Validate());
    }

    [Fact]
    public void KeyVaultSecretNamesBindToTheOriginsArray()
    {
        KeyVaultSecretManager manager = new();
        Dictionary<string, string?> secrets = new()
        {
            [manager.GetKey(new KeyVaultSecret("Cors--AllowedOrigins--0", ApiFactory.FrontendOrigin))] = ApiFactory.FrontendOrigin,
            [manager.GetKey(new KeyVaultSecret("Cors--AllowedOrigins--1", ApiFactory.CustomDomainOrigin))] = ApiFactory.CustomDomainOrigin,
        };

        CorsSettings? settings = new ConfigurationBuilder()
            .AddInMemoryCollection(secrets)
            .Build()
            .GetSection(CorsSettings.SectionName)
            .Get<CorsSettings>();

        Assert.NotNull(settings);
        Assert.Equal([ApiFactory.FrontendOrigin, ApiFactory.CustomDomainOrigin], settings.AllowedOrigins);
    }

    private Task<HttpResponseMessage> SendPreflightAsync(string origin, string method, string headers)
    {
        HttpRequestMessage request = new(HttpMethod.Options, "/api/health");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", method);
        request.Headers.Add("Access-Control-Request-Headers", headers);
        return factory.CreateClient().SendAsync(request, TestContext.Current.CancellationToken);
    }
}
