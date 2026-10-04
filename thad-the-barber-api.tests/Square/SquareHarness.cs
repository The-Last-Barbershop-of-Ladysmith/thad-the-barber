using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.Fakes;

namespace ThadTheBarber.Api.Tests.Square;

/// <summary>
/// The API's real Square wiring (<see cref="SquareSetup.AddSquareService"/>) over fake Key Vault, Square HTTP, clock
/// and logs.
/// </summary>
public sealed class SquareHarness : IDisposable
{
    public const string ApplicationId = "sandbox-test-app";
    public const string ApplicationSecret = "app-secret-value";
    public const string RefreshToken = "refresh-token-value";

    private readonly ServiceProvider _services;

    public SquareHarness(bool connected = true)
    {
        Dictionary<string, string> secrets = new() { [SquareSecrets.ApplicationSecret] = ApplicationSecret };
        if (connected)
        {
            secrets[SquareSecrets.RefreshToken] = RefreshToken;
        }

        Secrets = new FakeSecretClient(secrets);
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Square:BaseUrl"] = "https://square.example",
                ["Square:ApplicationId"] = ApplicationId,
            })
            .Build();

        ServiceCollection services = new();
        services.AddLogging(logging => logging.AddFakeLogging());
        services.AddSingleton<TimeProvider>(Time);
        services.AddSingleton<SecretClient>(Secrets);
        services.AddSquareService(configuration);
        foreach (string name in new[] { SquareSetup.HttpClientName, SquareSetup.OAuthHttpClientName })
        {
            services.AddHttpClient(name).ConfigurePrimaryHttpMessageHandler(() => Http);
        }

        _services = services.BuildServiceProvider();
    }

    public FakeSecretClient Secrets { get; }

    public FakeSquareHttp Http { get; } = new();

    public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 10, 4, 12, 0, 0, TimeSpan.Zero));

    public SquareAccessTokenProvider Tokens => _services.GetRequiredService<SquareAccessTokenProvider>();

    public ISquareService Square => _services.GetRequiredService<ISquareService>();

    public FakeLogCollector Logs => _services.GetFakeLogCollector();

    public void Dispose() => _services.Dispose();
}
