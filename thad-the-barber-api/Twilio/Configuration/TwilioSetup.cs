using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Handlers;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Twilio.Configuration;

public static class TwilioSetup
{
    public const string HttpClientName = "Twilio";
    private static readonly TimeSpan httpClientTimeout = TimeSpan.FromSeconds(10);

    public static IServiceCollection AddTwilioVerify(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<TwilioSettings>()
            .Bind(configuration.GetSection(TwilioSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<TwilioSettings>, TwilioSettingsValidator>();
        services.AddHttpClient(HttpClientName, client => client.Timeout = httpClientTimeout);
        services.AddSingleton<ITwilioVerifyService, TwilioVerifyService>();
        services.AddExceptionHandler<TwilioExceptionHandler>();
        return services;
    }
}
