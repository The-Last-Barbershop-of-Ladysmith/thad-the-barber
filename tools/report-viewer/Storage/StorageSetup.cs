using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Options;

namespace ThadTheBarber.ReportViewer.Storage;

public static class StorageSetup
{
    /// <summary>
    /// Reads the container as the app's system-assigned identity (Storage Blob Data Reader). The app also has a
    /// user-assigned identity, used only by App Service authentication; without AZURE_CLIENT_ID,
    /// <see cref="DefaultAzureCredential"/> picks the system-assigned one.
    /// </summary>
    public static IServiceCollection AddReportStore(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ReportsSettings>()
            .Bind(configuration.GetSection(ReportsSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton(provider => new BlobContainerClient(
            provider.GetRequiredService<IOptions<ReportsSettings>>().Value.ContainerUri,
            new DefaultAzureCredential()));
        services.AddSingleton<IReportStore, BlobReportStore>();
        return services;
    }
}
