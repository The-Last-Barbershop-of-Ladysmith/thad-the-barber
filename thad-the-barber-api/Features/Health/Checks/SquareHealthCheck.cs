using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Health.Checks;

/// <summary>
/// Unhealthy when Square doesn't answer or refuses our token. Runs on <c>GET /api/health?deep=true</c>; the result is
/// reused for <see cref="CacheFor"/> so frequent probes don't each call Square.
/// </summary>
public sealed class SquareHealthCheck(ISquareService square, IMemoryCache cache) : IHealthCheck
{
    public const string Name = "square";
    public static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(30);

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await cache.GetOrCreateAsync(Name, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            return square.CheckConnectionAsync(cancellationToken);
        }) switch
        {
            SquareConnection.Connected => HealthCheckResult.Healthy("Square is connected."),
            SquareConnection.NotConnected => new HealthCheckResult(context.Registration.FailureStatus, "Square isn't connected."),
            _ => new HealthCheckResult(context.Registration.FailureStatus, "Square is unreachable."),
        };
}
