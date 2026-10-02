using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Square;

namespace ThadTheBarber.Api.Tests;

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
    private readonly FakeSquareService _square;

    public ApiFactory()
        : this([FrontendOrigin, CustomDomainOrigin])
    {
    }

    internal ApiFactory(string[] origins, bool squareReachable = true)
    {
        _origins = origins;
        _square = new FakeSquareService(squareReachable);
    }

    internal ApiFactory(bool squareReachable)
        : this([FrontendOrigin, CustomDomainOrigin], squareReachable)
    {
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        for (int i = 0; i < _origins.Length; i++)
        {
            builder.UseSetting($"Cors:AllowedOrigins:{i}", _origins[i]);
        }

        builder.ConfigureTestServices(services => services.AddSingleton<ISquareService>(_square));
    }
}

public sealed class FakeSquareService(bool reachable) : ISquareService
{
    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(reachable);
}
