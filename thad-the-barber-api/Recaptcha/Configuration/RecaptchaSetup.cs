using ThadTheBarber.Api.Recaptcha.Services;

namespace ThadTheBarber.Api.Recaptcha.Configuration;

public static class RecaptchaSetup
{
    private static readonly Uri baseAddress = new("https://recaptchaenterprise.googleapis.com/");
    private static readonly TimeSpan httpClientTimeout = TimeSpan.FromSeconds(5);

    public static IServiceCollection AddRecaptcha(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RecaptchaSettings>()
            .Bind(configuration.GetSection(RecaptchaSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddHttpClient<IRecaptchaService, RecaptchaService>(client =>
        {
            client.BaseAddress = baseAddress;
            client.Timeout = httpClientTimeout;
        });
        return services;
    }
}
