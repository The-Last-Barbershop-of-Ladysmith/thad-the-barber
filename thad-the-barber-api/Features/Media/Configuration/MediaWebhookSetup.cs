using ThadTheBarber.Api.Features.Media.Services;

namespace ThadTheBarber.Api.Features.Media.Configuration;

public static class MediaWebhookSetup
{
    public static IServiceCollection AddMediaWebhook(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<MediaWebhookSettings>().Bind(configuration.GetSection(MediaWebhookSettings.SectionName));
        services.AddSingleton<MediaWebhookService>();
        return services;
    }
}
