using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Square;

namespace ThadTheBarber.Api.Features.Health;

/// <summary>Unhealthy when Square's API doesn't answer. Runs on <c>GET /api/health?deep=true</c>.</summary>
public sealed class SquareHealthCheck(ISquareService square) : IHealthCheck
{
    public const string Name = "square";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await square.IsReachableAsync(cancellationToken)
            ? HealthCheckResult.Healthy("Square is reachable.")
            : new HealthCheckResult(context.Registration.FailureStatus, "Square is unreachable.");
}
