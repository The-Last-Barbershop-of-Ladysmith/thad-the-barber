using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// Hosts the API in a "Testing" environment with made-up origins and a fake Square service, so tests never touch Azure
/// or Square. "Testing" is not Development (so production middleware like HSTS runs) and not an Azure environment
/// (so appsettings.Development.json / appsettings.Test.json, and their Key Vault names, never load).
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string FrontendOrigin = "https://app.example.com";
    public const string CustomDomainOrigin = "https://www.example.com";

    private readonly string[] _origins;
    private readonly ISquareService _square;

    public ApiFactory()
        : this(null, null)
    {
    }

    /// <param name="origins">The CORS allow-list; defaults to <see cref="FrontendOrigin"/> and <see cref="CustomDomainOrigin"/>.</param>
    /// <param name="square">
    /// Replaces Square under the caching decorator for this host; defaults to a connected <see cref="FakeSquareService"/>.
    /// </param>
    internal ApiFactory(string[]? origins = null, ISquareService? square = null)
    {
        _origins = origins ?? [FrontendOrigin, CustomDomainOrigin];
        _square = square ?? new FakeSquareService();
    }

    /// <summary>This host with its logs collected; read them from <c>Services.GetFakeLogCollector()</c>.</summary>
    public WebApplicationFactory<Program> WithFakeLogging() =>
        WithWebHostBuilder(builder => builder.ConfigureServices(services => services.AddLogging(logging => logging.AddFakeLogging())));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Square:ApplicationId", SquareHarness.ApplicationId);
        for (int i = 0; i < _origins.Length; i++)
        {
            builder.UseSetting($"Cors:AllowedOrigins:{i}", _origins[i]);
        }

        builder.ConfigureTestServices(services => services.AddKeyedSingleton(SquareSetup.UncachedServiceKey, _square));
    }
}
