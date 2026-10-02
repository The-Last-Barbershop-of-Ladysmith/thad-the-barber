using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Square;

public static class SquareSetup
{
    /// <summary>Square's settings and the typed HttpClient behind <see cref="ISquareService"/>.</summary>
    public static IServiceCollection AddSquareService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SquareSettings>()
            .Bind(configuration.GetSection(SquareSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddHttpClient<ISquareService, SquareService>((provider, client) =>
        {
            client.BaseAddress = provider.GetRequiredService<IOptions<SquareSettings>>().Value.BaseUrl;
            client.Timeout = TimeSpan.FromSeconds(5);
        });
        return services;
    }
}
