using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Services;

namespace ThadTheBarber.Api.Tests.Infrastructure.RateLimiting.Services;

public sealed class PhoneRateLimiterTests
{
    [Fact]
    public void AllowsThePermitLimitThenRefusesWithARetryAfter()
    {
        using PhoneRateLimiter limiter = Limiter(2);
        limiter.Enforce("+15555550123");
        limiter.Enforce("+15555550123");

        RateLimitedException refused = Assert.Throws<RateLimitedException>(() => limiter.Enforce("+15555550123"));

        Assert.InRange(refused.RetryAfter, TimeSpan.FromSeconds(1), TimeSpan.FromMinutes(10));
        Assert.Equal(StatusCodes.Status429TooManyRequests, refused.StatusCode);
        Assert.Equal("rate_limited", refused.Code);
    }

    [Fact]
    public void EachPhoneHasItsOwnLimit()
    {
        using PhoneRateLimiter limiter = Limiter(1);
        limiter.Enforce("+15555550123");

        limiter.Enforce("+15555550124");
    }

    [Fact]
    public void TheRefusalNeverRepeatsThePhone()
    {
        using PhoneRateLimiter limiter = Limiter(1);
        limiter.Enforce("+15555550123");

        RateLimitedException refused = Assert.Throws<RateLimitedException>(() => limiter.Enforce("+15555550123"));

        Assert.DoesNotContain("5555550123", refused.Message, StringComparison.Ordinal);
    }

    private static PhoneRateLimiter Limiter(int permitLimit) =>
        new(Options.Create(new RateLimitSettings
        {
            LookupPhone = new FixedWindowLimit
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(10),
            },
        }));
}
