using Microsoft.Extensions.DependencyInjection.Extensions;
using ThadTheBarber.Api.Common.Services;

namespace ThadTheBarber.Api.Common.Configuration;

public static class StaleCacheSetup
{
    public static IServiceCollection AddStaleCache(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.TryAddSingleton<StaleCache>();
        return services;
    }
}
