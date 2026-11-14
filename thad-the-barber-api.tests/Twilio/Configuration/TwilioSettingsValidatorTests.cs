using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Configuration;

namespace ThadTheBarber.Api.Tests.Twilio.Configuration;

public sealed class TwilioSettingsValidatorTests
{
    private static readonly TwilioSettingsValidator validator = new();

    [Fact]
    public void NothingSetPassesSoEnvironmentsWithoutTwilioStart()
    {
        Assert.True(validator.Validate(null, new TwilioSettings()).Succeeded);
        Assert.False(new TwilioSettings().IsConfigured);
    }

    [Fact]
    public void EverythingSetPasses()
    {
        TwilioSettings settings = FullSettings();

        Assert.True(validator.Validate(null, settings).Succeeded);
        Assert.True(settings.IsConfigured);
    }

    [Fact]
    public void AMissingApiKeySecretFailsOnceAnythingElseIsSet()
    {
        TwilioSettings settings = FullSettings();
        settings.ApiKeySecret = string.Empty;

        Assert.Contains(nameof(TwilioSettings.ApiKeySecret), validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
        Assert.False(settings.IsConfigured);
    }

    [Theory]
    [InlineData(nameof(TwilioSettings.AccountSid))]
    [InlineData(nameof(TwilioSettings.VerifyServiceSid))]
    [InlineData(nameof(TwilioSettings.ApiKeySid))]
    public void AMissingOrMismatchedSidFails(string settingName)
    {
        TwilioSettings settings = FullSettings();
        typeof(TwilioSettings).GetProperty(settingName)!.SetValue(settings, "XX0000000000000000000000000000000f");

        Assert.Contains(settingName, validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void OnlyTheSecretSetFailsEverySid()
    {
        ValidateOptionsResult result = validator.Validate(null, new TwilioSettings
        {
            ApiKeySecret = "made-up-secret",
        });

        Assert.Equal(3, result.Failures!.Count());
    }

    private static TwilioSettings FullSettings() => new()
    {
        AccountSid = "AC0000000000000000000000000000000f",
        VerifyServiceSid = "VA0000000000000000000000000000000f",
        ApiKeySid = "SK0000000000000000000000000000000f",
        ApiKeySecret = "made-up-secret",
    };
}
