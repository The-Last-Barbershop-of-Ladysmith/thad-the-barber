using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Features.Health.Models;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Health.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/health", GetHealthAsync)
            .WithName("GetHealth")
            .WithTags("Health")
            .AllowAnonymous()
            .NoStore();
        return api;
    }

    /// <summary>
    /// 200 with the build info. With <c>?deep=true</c> it also runs every registered health check, returning 503 if any
    /// is unhealthy.
    /// </summary>
    internal static async Task<Results<Ok<HealthResponse>, JsonHttpResult<HealthResponse>>> GetHealthAsync(
        BuildInfo build,
        HealthCheckService health,
        CancellationToken cancellationToken,
        bool deep = false)
    {
        if (!deep)
        {
            return TypedResults.Ok(new HealthResponse(
                HealthStatus.Healthy,
                build.Version,
                build.Commit
            ));
        }

        HealthReport report = await health.CheckHealthAsync(cancellationToken);
        Dictionary<string, HealthStatus> checks = report.Entries.ToDictionary(
            entry => entry.Key,
            entry => entry.Value.Status);
        HealthResponse body = new(
            report.Status,
            build.Version,
            build.Commit,
            checks
        );
        if (report.Status == HealthStatus.Unhealthy)
        {
            return TypedResults.Json(body, statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        return TypedResults.Ok(body);
    }
}
