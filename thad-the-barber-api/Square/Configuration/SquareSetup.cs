using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Square;
using ThadTheBarber.Api.Square.Handlers;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Square.Configuration;

public static class SquareSetup
{
    public const string HttpClientName = "Square";
    public const string OAuthHttpClientName = "SquareOAuth";
    private static readonly TimeSpan httpClientTimeout = TimeSpan.FromSeconds(10);
    private static readonly string squareAccessTokenPlaceholder = "set-by-SquareAuthHandler";

    /// <summary>
    /// Square's settings, the in-memory access token, and the SDK client behind <see cref="ISquareService"/>. Needs a
    /// <see cref="Azure.Security.KeyVault.Secrets.SecretClient"/> (registered by <c>KeyVaultSetup</c>).
    /// </summary>
    public static IServiceCollection AddSquareService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SquareSettings>()
            .Bind(configuration.GetSection(SquareSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<SquareAccessTokenProvider>();
        services.AddTransient<SquareAuthHandler>();
        services.AddTransient<NoAuthorizationHandler>();
        services.AddHttpClient(HttpClientName, client => client.Timeout = httpClientTimeout)
            .AddHttpMessageHandler<SquareAuthHandler>();
        services.AddHttpClient(OAuthHttpClientName, client => client.Timeout = httpClientTimeout)
            .AddHttpMessageHandler<NoAuthorizationHandler>();
        services.AddScoped<ISquareService>(provider => new SquareService(CreateClient(
            provider.GetRequiredService<IHttpClientFactory>().CreateClient(HttpClientName),
            provider.GetRequiredService<IOptions<SquareSettings>>().Value)));
        return services;
    }

    /// <summary>
    /// The SDK insists on a token when it's built. The <see cref="HttpClientName"/> client's
    /// <see cref="SquareAuthHandler"/> replaces it on every request, and the <see cref="OAuthHttpClientName"/> client's
    /// <see cref="NoAuthorizationHandler"/> removes it.
    /// </summary>
    internal static SquareClient CreateClient(HttpClient http, SquareSettings settings) =>
        new(squareAccessTokenPlaceholder, new ClientOptions
        {
            BaseUrl = settings.BaseUrl.ToString().TrimEnd('/'),
            HttpClient = http,
        });
}
