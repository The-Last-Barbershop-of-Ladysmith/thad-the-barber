using ThadTheBarber.Api.Infrastructure.Problems.Handlers;

namespace ThadTheBarber.Api.Infrastructure.Problems.Configuration;

/// <summary>
/// Every error body is ProblemDetails with a <c>code</c> the UI can switch on. Exception handlers set their own; problems
/// the framework writes (validation, auth, unknown routes, rate limits, unhandled errors) get one from their status.
/// </summary>
public static class ProblemsSetup
{
    public const string CodeKey = "code";

    public static IServiceCollection AddProblems(this IServiceCollection services)
    {
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            if (context.ProblemDetails.Status is int status)
            {
                context.ProblemDetails.Extensions.TryAdd(CodeKey, CodeFor(status));
            }
        });
        services.AddExceptionHandler<ProblemExceptionHandler>();
        return services;
    }

    private static string CodeFor(int status) => status switch
    {
        StatusCodes.Status400BadRequest => "validation_failed",
        StatusCodes.Status401Unauthorized => "unauthorized",
        StatusCodes.Status403Forbidden => "forbidden",
        StatusCodes.Status404NotFound => "not_found",
        StatusCodes.Status405MethodNotAllowed => "method_not_allowed",
        StatusCodes.Status413PayloadTooLarge => "payload_too_large",
        StatusCodes.Status415UnsupportedMediaType => "unsupported_media_type",
        StatusCodes.Status429TooManyRequests => "rate_limited",
        _ => "internal_error",
    };
}
