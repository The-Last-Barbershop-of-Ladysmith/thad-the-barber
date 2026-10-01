namespace ThadTheBarber.Api.Infrastructure;

public static class SecurityHeaders
{
    /// <summary>
    /// Adds <c>X-Content-Type-Options: nosniff</c> to every response. It's set when the response starts so it survives
    /// the exception handler, which clears headers before writing ProblemDetails.
    /// </summary>
    public static IApplicationBuilder UseNoSniff(this IApplicationBuilder app) =>
        app.Use((context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                context.Response.Headers.XContentTypeOptions = "nosniff";
                return Task.CompletedTask;
            });
            return next(context);
        });

    /// <summary>Marks responses <c>Cache-Control: no-store</c>. Use on booking and session endpoints (and health).</summary>
    public static TBuilder NoStore<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.AddEndpointFilter((context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            return next(context);
        });
}
