using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Infrastructure;
using ThadTheBarber.Api.Square;

namespace ThadTheBarber.Api.Features.Health;

public static class HealthEndpoints
{
    public static IServiceCollection AddHealth(this IServiceCollection services) =>
        services.AddSingleton(BuildInfo.FromAssembly(typeof(HealthEndpoints).Assembly));

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/health", GetHealthAsync)
            .WithName("GetHealth")
            .WithTags("Health")
            .NoStore();
        return api;
    }

    /// <summary>200 with the build info. With <c>?deep=true</c> it also checks Square, returning 503 if it's unreachable.</summary>
    internal static async Task<Results<Ok<HealthResponse>, JsonHttpResult<HealthResponse>>> GetHealthAsync(
        BuildInfo build,
        ISquareService square,
        CancellationToken cancellationToken,
        bool deep = false)
    {
        if (!deep)
        {
            return TypedResults.Ok(new HealthResponse("ok", build.Version, build.Commit));
        }

        bool reachable = await square.IsReachableAsync(cancellationToken);
        return reachable
            ? TypedResults.Ok(new HealthResponse("ok", build.Version, build.Commit, "reachable"))
            : TypedResults.Json(
                new HealthResponse("degraded", build.Version, build.Commit, "unreachable"),
                statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}
