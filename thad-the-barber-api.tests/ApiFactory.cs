using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Square;

namespace ThadTheBarber.Api.Tests;

/// <summary>
/// Hosts the API in the "Test" environment (so production-only middleware like HSTS runs) with two allowed origins and
/// a fake Square service, so nothing calls Square.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string FrontendOrigin = "https://app-ttb-web-dev.azurewebsites.net";
    public const string CustomDomainOrigin = "https://www.example.com";

    private readonly string[] _origins;

    public ApiFactory()
        : this([FrontendOrigin, CustomDomainOrigin])
    {
    }

    internal ApiFactory(string[] origins) => _origins = origins;

    public FakeSquareService Square { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        for (int i = 0; i < _origins.Length; i++)
        {
            builder.UseSetting($"Cors:AllowedOrigins:{i}", _origins[i]);
        }

        builder.ConfigureTestServices(services => services.AddSingleton<ISquareService>(Square));
    }
}

public sealed class FakeSquareService : ISquareService
{
    public bool Reachable { get; set; } = true;

    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(Reachable);
}
