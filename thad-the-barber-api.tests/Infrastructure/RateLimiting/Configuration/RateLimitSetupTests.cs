using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.RateLimiting.Configuration;

/// <summary>
/// Runs with forwarded headers on, as App Service does, so <c>X-Forwarded-For</c> picks the client IP, and with 2
/// requests per window so a third is refused.
/// </summary>
public sealed class RateLimitSetupTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string FirstClientIp = "198.51.100.7";
    private const string SecondClientIp = "203.0.113.42";

    [Fact]
    public async Task ThirdSessionRequestFromOneIpIsRateLimited()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await StartSessionAsync(client));
        AssertNotLimited(await StartSessionAsync(client));
        using HttpResponseMessage third = await StartSessionAsync(client);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task EachIpHasItsOwnLimit()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient first = ClientFrom(limited, FirstClientIp);
        using HttpClient second = ClientFrom(limited, SecondClientIp);

        AssertNotLimited(await StartSessionAsync(first));
        AssertNotLimited(await StartSessionAsync(first));
        using HttpResponseMessage response = await StartSessionAsync(second);

        AssertNotLimited(response);
    }

    [Fact]
    public async Task BookingCancelAndRescheduleShareOneLimit()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await client.PostAsJsonAsync("/api/bookings", new { }, TestContext.Current.CancellationToken));
        AssertNotLimited(await client.PostAsync("/api/bookings/BKG-NOT-REAL/cancel", null, TestContext.Current.CancellationToken));
        using HttpResponseMessage third = await client.PostAsJsonAsync("/api/bookings/BKG-NOT-REAL/reschedule", new { }, TestContext.Current.CancellationToken);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task ReadsAreNotRateLimited()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        for (int i = 0; i < 3; i++)
        {
            using HttpResponseMessage response = await client.GetAsync("/api/shop", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    private WebApplicationFactory<Program> WithLimitOfTwo() =>
        factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("FORWARDEDHEADERS_ENABLED", "true");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:Session:PermitLimit"] = "2",
                ["RateLimits:Booking:PermitLimit"] = "2",
            }));
        });

    private static HttpClient ClientFrom(WebApplicationFactory<Program> host, string clientIp)
    {
        HttpClient client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", clientIp);
        return client;
    }

    private static Task<HttpResponseMessage> StartSessionAsync(HttpClient client) =>
        client.PostAsJsonAsync("/api/session", new { recaptchaToken = "fake-token" }, TestContext.Current.CancellationToken);

    private static void AssertNotLimited(HttpResponseMessage response)
    {
        using (response)
        {
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }
    }

    private static async Task AssertRateLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        TimeSpan? retryAfter = response.Headers.RetryAfter?.Delta;
        Assert.NotNull(retryAfter);
        Assert.InRange(retryAfter.Value, TimeSpan.FromSeconds(1), TimeSpan.FromMinutes(10));
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("rate_limited", body.GetProperty("code").GetString());
    }
}
