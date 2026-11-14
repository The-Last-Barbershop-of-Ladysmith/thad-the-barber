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

    [Fact]
    public void MissingManageLimitFails()
    {
        ValidateOptionsResult result = Validate(Limit(5, TimeSpan.FromMinutes(10)), Limit(5, TimeSpan.FromMinutes(10)), new FixedWindowLimit());

        Assert.True(result.Failed);
        Assert.Contains("RateLimits:Manage:PermitLimit", result.FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void MissingNextTimesLimitFails()
    {
        ValidateOptionsResult result = Validate(Limit(5, TimeSpan.FromMinutes(10)), Limit(5, TimeSpan.FromMinutes(10)), nextTimes: new FixedWindowLimit());

        Assert.True(result.Failed);
        Assert.Contains("RateLimits:NextTimes:PermitLimit", result.FailureMessage, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(nameof(RateLimitSettings.LookupCode))]
    [InlineData(nameof(RateLimitSettings.LookupVerifiedList))]
    [InlineData(nameof(RateLimitSettings.Contact))]
    public void AMissingLookupLimitFails(string limitName)
    {
        RateLimitSettings settings = ValidSettings();
        typeof(RateLimitSettings).GetProperty(limitName)!.SetValue(settings, new FixedWindowLimit());

        ValidateOptionsResult result = new RateLimitSettingsValidator().Validate(null, settings);

        Assert.True(result.Failed);
        Assert.Contains($"RateLimits:{limitName}:PermitLimit", result.FailureMessage, StringComparison.Ordinal);
    }

    private static RateLimitSettings ValidSettings() => new()
    {
        Session = Limit(5, TimeSpan.FromMinutes(10)),
        Booking = Limit(5, TimeSpan.FromMinutes(10)),
        Manage = Limit(5, TimeSpan.FromMinutes(10)),
        NextTimes = Limit(5, TimeSpan.FromMinutes(10)),
        LookupCode = Limit(5, TimeSpan.FromMinutes(10)),
        LookupVerifiedList = Limit(5, TimeSpan.FromMinutes(10)),
        Contact = Limit(5, TimeSpan.FromMinutes(10)),
    };

    private static ValidateOptionsResult Validate(FixedWindowLimit session, FixedWindowLimit booking, FixedWindowLimit? manage = null, FixedWindowLimit? nextTimes = null, FixedWindowLimit? lookupCode = null) =>
        new RateLimitSettingsValidator().Validate(null, new RateLimitSettings
        {
            Session = session,
            Booking = booking,
            Manage = manage ?? Limit(5, TimeSpan.FromMinutes(10)),
            NextTimes = nextTimes ?? Limit(5, TimeSpan.FromMinutes(10)),
            LookupCode = lookupCode ?? Limit(5, TimeSpan.FromMinutes(10)),
            LookupVerifiedList = Limit(5, TimeSpan.FromMinutes(10)),
            Contact = Limit(5, TimeSpan.FromMinutes(10)),
        });

    private static FixedWindowLimit Limit(int permitLimit, TimeSpan window) => new()
    {
        PermitLimit = permitLimit,
        Window = window,
    };
}
