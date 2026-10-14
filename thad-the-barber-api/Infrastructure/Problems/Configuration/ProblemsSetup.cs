using ThadTheBarber.Api.Infrastructure.Problems.Handlers;

namespace ThadTheBarber.Api.Infrastructure.Problems.Configuration;

/// <summary>
/// Every error body is ProblemDetails with a <c>code</c> the UI can switch on. Exception handlers set their own; problems
/// the framework writes (validation, auth, unknown routes, rate limits, unhandled errors) get one from their type and
/// status.
/// </summary>
public static class ProblemsSetup
{
    public const string CodeKey = "code";

    public static IServiceCollection AddProblems(this IServiceCollection services)
    {
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            // ASP.NET links an RFC section for common statuses only (not 429); RFC 9457 reads a missing type as about:blank.
            context.ProblemDetails.Type ??= "about:blank";
            if (context.ProblemDetails is HttpValidationProblemDetails)
            {
                context.ProblemDetails.Extensions.TryAdd(CodeKey, "validation_failed");
            }
            else if (context.ProblemDetails.Status is int status)
            {
                context.ProblemDetails.Extensions.TryAdd(CodeKey, CodeFor(status));
            }
        });
        services.AddExceptionHandler<ProblemExceptionHandler>();
        // Development throws on an unreadable body by default, which the exception handler turns into a 500; the
        // Azure dev app runs as Development, so it should answer 400 like every other environment.
        services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = false);
        return services;
    }

    private static string CodeFor(int status) => status switch
    {
        StatusCodes.Status401Unauthorized => "unauthorized",
        StatusCodes.Status403Forbidden => "forbidden",
        StatusCodes.Status404NotFound => "not_found",
        StatusCodes.Status405MethodNotAllowed => "method_not_allowed",
        StatusCodes.Status413PayloadTooLarge => "payload_too_large",
        StatusCodes.Status415UnsupportedMediaType => "unsupported_media_type",
        StatusCodes.Status429TooManyRequests => "rate_limited",
        < StatusCodes.Status500InternalServerError => "bad_request",
        _ => "internal_error",
    };
}
