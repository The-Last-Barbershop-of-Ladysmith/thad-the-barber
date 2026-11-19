using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Twilio.Configuration;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Configuration;

public sealed class TextMessagesSettingsValidatorTests
{
    [Fact]
    public void TextsOffPassesWhateverElseIsSetSoEveryEnvironmentStartsOff()
    {
        Assert.True(Validate(new TextMessagesSettings(), new TwilioSettings()).Succeeded);
    }

    [Fact]
    public void TextsOnWithEverythingSetPasses()
    {
        Assert.True(Validate(EnabledSettings(), TwilioWithSender()).Succeeded);
    }

    [Fact]
    public void TextsOnWithoutAnHttpsSiteUrlFails()
    {
        TextMessagesSettings settings = EnabledSettings();
        settings.SiteUrl = "http://www.example.com";

        Assert.Contains(nameof(TextMessagesSettings.SiteUrl), Validate(settings, TwilioWithSender()).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void TextsOnWithoutATwilioSenderFails()
    {
        TwilioSettings twilio = TwilioWithSender();
        twilio.FromNumber = string.Empty;

        Assert.Contains(nameof(TextMessagesSettings.IsEnabled), Validate(EnabledSettings(), twilio).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void TheLeadMustBeLongerThanTheMinimumNotice()
    {
        TextMessagesSettings settings = EnabledSettings();
        settings.ReminderMinimumNotice = TimeSpan.FromHours(30);

        Assert.Contains(nameof(TextMessagesSettings.ReminderLead), Validate(settings, TwilioWithSender()).FailureMessage, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(24)]
    public void ReminderHoursMustBeHoursOfTheDay(int hour)
    {
        TextMessagesSettings settings = EnabledSettings();
        settings.ReminderHours = [9, hour];

        Assert.Contains(nameof(TextMessagesSettings.ReminderHours), Validate(settings, TwilioWithSender()).FailureMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void ThereMustBeAtLeastOneReminderHour()
    {
        TextMessagesSettings settings = EnabledSettings();
        settings.ReminderHours = [];

        Assert.False(Validate(settings, TwilioWithSender()).Succeeded);
    }

    private static ValidateOptionsResult Validate(TextMessagesSettings settings, TwilioSettings twilio) =>
        new TextMessagesSettingsValidator(Options.Create(twilio)).Validate(null, settings);

    private static TextMessagesSettings EnabledSettings() => new()
    {
        IsEnabled = true,
        SiteUrl = "https://www.example.com",
    };

    private static TwilioSettings TwilioWithSender() => new()
    {
        AccountSid = "AC0000000000000000000000000000000f",
        VerifyServiceSid = "VA0000000000000000000000000000000f",
        ApiKeySid = "SK0000000000000000000000000000000f",
        ApiKeySecret = "made-up-secret",
        FromNumber = "+15005550006",
    };
}
