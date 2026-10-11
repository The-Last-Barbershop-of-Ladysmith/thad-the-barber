using ThadTheBarber.Api.Features.Health.Checks;
using ThadTheBarber.Api.Features.Health.Models;

namespace ThadTheBarber.Api.Features.Health.Configuration;

public static class HealthSetup
{
    /// <summary>Build info plus the dependency checks a deep health check runs. Register new checks here.</summary>
    public static IServiceCollection AddHealth(this IServiceCollection services)
    {
        services.AddSingleton(BuildInfo.FromAssembly(typeof(HealthSetup).Assembly));
        services.AddMemoryCache();
        services.AddHealthChecks()
            .AddCheck<SquareHealthCheck>(SquareHealthCheck.Name)
            .AddCheck<BookableServiceHealthCheck>(BookableServiceHealthCheck.Name);
        return services;
    }
}
