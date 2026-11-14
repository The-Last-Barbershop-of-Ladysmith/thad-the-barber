using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
    public async Task ThirdBookingAttemptFromOneIpIsRateLimited()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await BookAsync(client));
        AssertNotLimited(await BookAsync(client));
        using HttpResponseMessage third = await BookAsync(client);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task UsedUpBookingAttemptsDontStopManagingABooking()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);
        AssertNotLimited(await BookAsync(client));
        AssertNotLimited(await BookAsync(client));

        using HttpResponseMessage cancel = await client.PostAsync("/api/bookings/BKG-NOT-REAL/cancel", null, TestContext.Current.CancellationToken);

        AssertNotLimited(cancel);
    }

    [Fact]
    public async Task CancelAndRescheduleShareTheManageLimit()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await client.PostAsync("/api/bookings/BKG-NOT-REAL/cancel", null, TestContext.Current.CancellationToken));
        AssertNotLimited(await client.PostAsJsonAsync("/api/bookings/BKG-NOT-REAL/reschedule", new { }, TestContext.Current.CancellationToken));
        using HttpResponseMessage third = await client.PostAsync("/api/bookings/BKG-NOT-REAL/cancel", null, TestContext.Current.CancellationToken);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task ThirdNextTimesRequestFromOneIpIsRateLimited()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await client.GetAsync("/api/bookings/next?count=6", TestContext.Current.CancellationToken));
        AssertNotLimited(await client.GetAsync("/api/bookings/next?count=6", TestContext.Current.CancellationToken));
        using HttpResponseMessage third = await client.GetAsync("/api/bookings/next?count=6", TestContext.Current.CancellationToken);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task ThirdLookupStartFromOneIpIsRateLimitedWhateverThePhone()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await SendLookupCodeAsync(client, "+15555550101"));
        AssertNotLimited(await SendLookupCodeAsync(client, "+15555550102"));
        using HttpResponseMessage third = await SendLookupCodeAsync(client, "+15555550103");

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task ThirdLookupVerifyFromOneIpIsRateLimited()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);

        AssertNotLimited(await GetVerifiedListAsync(client));
        AssertNotLimited(await GetVerifiedListAsync(client));
        using HttpResponseMessage third = await GetVerifiedListAsync(client);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task ThirdVerifyForOnePhoneIsRateLimitedEvenFromAnotherIp()
    {
        using WebApplicationFactory<Program> limited = WithPhoneVerifyLimitOfTwo();
        using HttpClient firstClient = ClientFrom(limited, FirstClientIp);
        using HttpClient secondClient = ClientFrom(limited, SecondClientIp);

        AssertNotLimited(await GetVerifiedListAsync(firstClient));
        AssertNotLimited(await GetVerifiedListAsync(secondClient));
        using HttpResponseMessage third = await GetVerifiedListAsync(firstClient);

        await AssertRateLimitedAsync(third);
    }

    [Fact]
    public async Task AnotherPhoneIsNotLimitedByTheFirstPhonesVerifyAttempts()
    {
        using WebApplicationFactory<Program> limited = WithPhoneVerifyLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);
        AssertNotLimited(await GetVerifiedListAsync(client));
        AssertNotLimited(await GetVerifiedListAsync(client));

        using HttpResponseMessage otherPhone = await GetVerifiedListAsync(client, "+15555550102");

        AssertNotLimited(otherPhone);
    }

    [Fact]
    public async Task LookupStartAndVerifyHaveSeparateLimits()
    {
        using WebApplicationFactory<Program> limited = WithLimitOfTwo();
        using HttpClient client = ClientFrom(limited, FirstClientIp);
        AssertNotLimited(await SendLookupCodeAsync(client, "+15555550101"));
        AssertNotLimited(await SendLookupCodeAsync(client, "+15555550102"));

        using HttpResponseMessage verify = await GetVerifiedListAsync(client);

        AssertNotLimited(verify);
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
                ["RateLimits:Manage:PermitLimit"] = "2",
                ["RateLimits:NextTimes:PermitLimit"] = "2",
                ["RateLimits:LookupStart:PermitLimit"] = "2",
                ["RateLimits:LookupVerify:PermitLimit"] = "2",
            }));
        });

    private WebApplicationFactory<Program> WithPhoneVerifyLimitOfTwo() =>
        factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("FORWARDEDHEADERS_ENABLED", "true");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimits:LookupVerify:PermitLimit"] = "100",
                ["RateLimits:LookupVerifyPhone:PermitLimit"] = "2",
            }));
        });

    private static HttpClient ClientFrom(WebApplicationFactory<Program> host, string clientIp)
    {
        HttpClient client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", clientIp);
        return client;
    }

    private static Task<HttpResponseMessage> BookAsync(HttpClient client) =>
        client.PostAsJsonAsync("/api/bookings", new { }, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> SendLookupCodeAsync(HttpClient client, string phone) =>
        client.PostAsJsonAsync("/api/bookings/lookup/code", new { phone }, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> GetVerifiedListAsync(HttpClient client, string phone = "+15555550101") =>
        client.PostAsJsonAsync("/api/bookings/lookup/verified-list", new { phone, code = "000000" }, TestContext.Current.CancellationToken);

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
        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status429TooManyRequests, "rate_limited");
    }
}
