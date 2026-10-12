using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Tests.Infrastructure.RateLimiting.Configuration;

public sealed class RateLimitSettingsValidatorTests
{
    [Fact]
    public void PositiveLimitsPass()
    {
        ValidateOptionsResult result = Validate(Limit(5, TimeSpan.FromMinutes(10)), Limit(1, TimeSpan.FromSeconds(1)));

        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData(0, 600)]
    [InlineData(-1, 600)]
    [InlineData(5, 0)]
    [InlineData(5, -1)]
    public void ZeroOrNegativeBookingLimitFails(int permitLimit, int windowSeconds)
    {
        ValidateOptionsResult result = Validate(Limit(5, TimeSpan.FromMinutes(10)), Limit(permitLimit, TimeSpan.FromSeconds(windowSeconds)));

        Assert.True(result.Failed);
        Assert.Contains("RateLimits:Booking:", result.FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void MissingSessionLimitFailsForBothValues()
    {
        ValidateOptionsResult result = Validate(new FixedWindowLimit(), Limit(5, TimeSpan.FromMinutes(10)));

        Assert.True(result.Failed);
        Assert.Contains("RateLimits:Session:PermitLimit", result.FailureMessage, StringComparison.Ordinal);
        Assert.Contains("RateLimits:Session:Window", result.FailureMessage, StringComparison.Ordinal);
    }

    private static ValidateOptionsResult Validate(FixedWindowLimit session, FixedWindowLimit booking) =>
        new RateLimitSettingsValidator().Validate(null, new RateLimitSettings
        {
            Session = session,
            Booking = booking,
        });

    private static FixedWindowLimit Limit(int permitLimit, TimeSpan window) => new()
    {
        PermitLimit = permitLimit,
        Window = window,
    };
}
