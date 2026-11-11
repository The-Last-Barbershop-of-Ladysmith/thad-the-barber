using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Infrastructure.Storage.Configuration;

public static class MediaStorageSetup
{
    public static IServiceCollection AddMediaStorage(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<MediaStorageSettings>()
            .Bind(configuration.GetSection(MediaStorageSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton(provider =>
        {
            MediaStorageSettings storage = provider.GetRequiredService<IOptions<MediaStorageSettings>>().Value;
            return new BlobServiceClient(
                new Uri($"https://{storage.AccountName}.blob.core.windows.net/"),
                new DefaultAzureCredential()
            );
        });
        services.AddSingleton<IMediaStorage, AzureMediaStorage>();
        services.AddMemoryCache();
        services.TryAddSingleton<StaleCache>();
        return services;
    }
}
