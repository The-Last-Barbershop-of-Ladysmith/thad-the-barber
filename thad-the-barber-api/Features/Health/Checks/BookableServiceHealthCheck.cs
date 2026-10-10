using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Health.Checks;

/// <summary>
/// Unhealthy when the Square catalog doesn't name the shop's one bookable service, so nobody can book. The result is
/// reused for <see cref="SquareHealthCheck.CacheFor"/>: with nothing cached yet, a Square outage would otherwise make
/// every probe wait for Square's timeout.
/// </summary>
public sealed class BookableServiceHealthCheck(BookableServiceResolver resolver, IMemoryCache cache) : IHealthCheck
{
    public const string Name = "bookableService";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await cache.GetOrCreateAsync(Name, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SquareHealthCheck.CacheFor;
            return ResolveAsync(context, cancellationToken);
        });

    private async Task<HealthCheckResult> ResolveAsync(HealthCheckContext context, CancellationToken cancellationToken)
    {
        try
        {
            await resolver.ResolveAsync(cancellationToken);
            return HealthCheckResult.Healthy("The bookable service is resolved.");
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, exception.Message, exception);
        }
    }
}
