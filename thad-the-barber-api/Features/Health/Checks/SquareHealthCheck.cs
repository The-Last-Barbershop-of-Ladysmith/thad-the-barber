using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Health.Checks;

/// <summary>Unhealthy when Square doesn't answer or refuses our token. Runs on <c>GET /api/health?deep=true</c>.</summary>
public sealed class SquareHealthCheck(ISquareService square) : IHealthCheck
{
    public const string Name = "square";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await square.CheckConnectionAsync(cancellationToken) switch
        {
            SquareConnection.Connected => HealthCheckResult.Healthy("Square is connected."),
            SquareConnection.NotConnected => new HealthCheckResult(context.Registration.FailureStatus, "Square isn't connected."),
            _ => new HealthCheckResult(context.Registration.FailureStatus, "Square is unreachable."),
        };
}
