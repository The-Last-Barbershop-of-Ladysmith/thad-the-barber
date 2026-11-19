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
    }

    [Fact]
    public void NothingSetIsNotConfigured()
    {
        Assert.False(new TwilioSettings().IsConfigured);
    }

    [Fact]
    public void EverythingSetIsConfigured()
    {
        Assert.True(FullSettings().IsConfigured);
    }

    [Fact]
    public void EverythingSetPasses()
    {
        Assert.True(validator.Validate(null, FullSettings()).Succeeded);
    }

    [Fact]
    public void AMissingApiKeySecretFailsOnceAnythingElseIsSet()
    {
        TwilioSettings settings = FullSettings();
        settings.ApiKeySecret = string.Empty;

        Assert.Contains(nameof(TwilioSettings.ApiKeySecret), validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void AMissingApiKeySecretIsNotConfigured()
    {
        TwilioSettings settings = FullSettings();
        settings.ApiKeySecret = string.Empty;

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

    [Fact]
    public void TheTestAccountSidMayStandInForTheApiKeySid()
    {
        TwilioSettings settings = FullSettings();
        settings.ApiKeySid = settings.AccountSid;

        Assert.True(validator.Validate(null, settings).Succeeded);
    }

    [Fact]
    public void AMessagingServiceSidMustStartWithMG()
    {
        TwilioSettings settings = FullSettings();
        settings.MessagingServiceSid = "XX0000000000000000000000000000000f";

        Assert.Contains(nameof(TwilioSettings.MessagingServiceSid), validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void ASenderNumberMustBeInE164Form()
    {
        TwilioSettings settings = FullSettings();
        settings.FromNumber = "5005550006";

        Assert.Contains(nameof(TwilioSettings.FromNumber), validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void TheWebhookBaseUrlMustBeAnHttpsUrl()
    {
        TwilioSettings settings = FullSettings();
        settings.WebhookBaseUrl = "http://api.example.com";

        Assert.Contains(nameof(TwilioSettings.WebhookBaseUrl), validator.Validate(null, settings).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void TextsCanBeSentOnlyWithAMessagingServiceOrASenderNumber()
    {
        TwilioSettings settings = FullSettings();
        Assert.False(settings.CanSendTexts);

        settings.FromNumber = "+15005550006";
        Assert.True(settings.CanSendTexts);

        settings.FromNumber = string.Empty;
        settings.MessagingServiceSid = "MG0000000000000000000000000000000f";
        Assert.True(settings.CanSendTexts);
    }

    private static TwilioSettings FullSettings() => new()
    {
        AccountSid = "AC0000000000000000000000000000000f",
        VerifyServiceSid = "VA0000000000000000000000000000000f",
        ApiKeySid = "SK0000000000000000000000000000000f",
        ApiKeySecret = "made-up-secret",
    };
}
