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

    // The SDK clients live for the app's lifetime, so their connections are recycled instead of their handlers, which
    // still picks up DNS changes.
    private static readonly TimeSpan pooledConnectionLifetime = TimeSpan.FromMinutes(5);
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
        AddLongLivedHttpClient(services, HttpClientName).AddHttpMessageHandler<SquareAuthHandler>();
        AddLongLivedHttpClient(services, OAuthHttpClientName).AddHttpMessageHandler<NoAuthorizationHandler>();
        services.AddSingleton(provider => CreateClient(provider, HttpClientName));
        services.AddKeyedSingleton(OAuthHttpClientName, (provider, _) => CreateClient(provider, OAuthHttpClientName));
        services.AddSingleton<ISquareService, SquareService>();
        services.AddMemoryCache();
        services.AddSingleton<BookableServiceResolver>();
        services.AddExceptionHandler<SquareExceptionHandler>();
        return services;
    }

    /// <summary>
    /// The SDK insists on a token when it's built. The <see cref="HttpClientName"/> client's
    /// <see cref="SquareAuthHandler"/> replaces it on every request, and the <see cref="OAuthHttpClientName"/> client's
    /// <see cref="NoAuthorizationHandler"/> removes it.
    /// </summary>
    private static SquareClient CreateClient(IServiceProvider provider, string httpClientName) =>
        new(squareAccessTokenPlaceholder, new ClientOptions
        {
            BaseUrl = provider.GetRequiredService<IOptions<SquareSettings>>().Value.BaseUrl.ToString().TrimEnd('/'),
            HttpClient = provider.GetRequiredService<IHttpClientFactory>().CreateClient(httpClientName),
        });

    private static IHttpClientBuilder AddLongLivedHttpClient(IServiceCollection services, string name) =>
        services.AddHttpClient(name, client => client.Timeout = httpClientTimeout)
            .UseSocketsHttpHandler((handler, _) => handler.PooledConnectionLifetime = pooledConnectionLifetime)
            .SetHandlerLifetime(Timeout.InfiniteTimeSpan);
}
