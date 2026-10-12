using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

/// <summary>
/// Fixed-window limits per client IP. On App Service, <c>ASPNETCORE_FORWARDEDHEADERS_ENABLED</c> (set in Bicep) makes
/// <c>RemoteIpAddress</c> the client's address from <c>X-Forwarded-For</c>, not the front end's. A refused request is
/// 429 with <c>Retry-After</c>; its ProblemDetails body (<c>rate_limited</c>) comes from the status code pages.
/// </summary>
public static class RateLimitSetup
{
    public const string SessionPolicy = "session";
    public const string BookingPolicy = "booking";
    public const string ManagePolicy = "manage";

    public static IServiceCollection AddRateLimits(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RateLimitSettings>()
            .Bind(configuration.GetSection(RateLimitSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<RateLimitSettings>, RateLimitSettingsValidator>();

        services.AddRateLimiter(_ => { });
        services.AddOptions<RateLimiterOptions>()
            .Configure<IOptions<RateLimitSettings>>((options, settings) =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.OnRejected = (context, _) =>
                {
                    if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
                    {
                        context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                    }

                    return ValueTask.CompletedTask;
                };
                options.AddPolicy(SessionPolicy, context => PerClientIp(context, settings.Value.Session));
                options.AddPolicy(BookingPolicy, context => PerClientIp(context, settings.Value.Booking));
                options.AddPolicy(ManagePolicy, context => PerClientIp(context, settings.Value.Manage));
            });
        return services;
    }

    private static RateLimitPartition<string> PerClientIp(HttpContext context, FixedWindowLimit limit) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit.PermitLimit,
                Window = limit.Window,
            });
}
