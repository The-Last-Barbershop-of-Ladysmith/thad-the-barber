using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Reviews.Services;

namespace ThadTheBarber.Api.Features.Reviews.Configuration;

public static class ReviewsSetup
{
    private const long MaxFileBytes = 1_000_000;
    private static readonly TimeSpan httpClientTimeout = TimeSpan.FromSeconds(5);

    public static IServiceCollection AddReviews(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ReviewsSettings>()
            .Bind(configuration.GetSection(ReviewsSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddHttpClient(ReviewsService.HttpClientName, (provider, client) =>
        {
            ReviewsSettings reviews = provider.GetRequiredService<IOptions<ReviewsSettings>>().Value;
            client.BaseAddress = new Uri($"https://{reviews.MediaAccountName}.blob.core.windows.net/{reviews.MediaContainerName}/");
            client.Timeout = httpClientTimeout;
            client.MaxResponseContentBufferSize = MaxFileBytes;
        });
        services.AddSingleton<ReviewsService>();
        return services;
    }
}
