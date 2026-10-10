using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Recaptcha.Configuration;

namespace ThadTheBarber.Api.Tests.Recaptcha.Configuration;

public sealed class RecaptchaSetupTests
{
    [Theory]
    [InlineData("ProjectId")]
    [InlineData("SiteKey")]
    [InlineData("ApiKey")]
    public void StartupFailsWhenASettingIsMissing(string missing)
    {
        Dictionary<string, string?> settings = CompleteSettings();
        settings.Remove($"Recaptcha:{missing}");

        Assert.Throws<OptionsValidationException>(() => ValidateStartup(settings));
    }

    [Theory]
    [InlineData("-0.1")]
    [InlineData("1.01")]
    public void StartupFailsWhenTheThresholdIsOutsideZeroToOne(string minScore)
    {
        Dictionary<string, string?> settings = CompleteSettings();
        settings["Recaptcha:MinScore"] = minScore;

        Assert.Throws<OptionsValidationException>(() => ValidateStartup(settings));
    }

    [Fact]
    public void TheThresholdDefaultsToAHalf()
    {
        using ServiceProvider services = BuildServices(CompleteSettings());

        Assert.Equal(0.5, services.GetRequiredService<IOptions<RecaptchaSettings>>().Value.MinScore);
    }

    private static Dictionary<string, string?> CompleteSettings() =>
        new()
        {
            ["Recaptcha:ProjectId"] = "fake-project",
            ["Recaptcha:SiteKey"] = "fake-site-key",
            ["Recaptcha:ApiKey"] = "fake-api-key",
        };

    private static void ValidateStartup(Dictionary<string, string?> settings)
    {
        using ServiceProvider services = BuildServices(settings);
        services.GetRequiredService<IStartupValidator>().Validate();
    }

    private static ServiceProvider BuildServices(Dictionary<string, string?> settings) =>
        new ServiceCollection()
            .AddRecaptcha(new ConfigurationBuilder().AddInMemoryCollection(settings).Build())
            .BuildServiceProvider();
}
