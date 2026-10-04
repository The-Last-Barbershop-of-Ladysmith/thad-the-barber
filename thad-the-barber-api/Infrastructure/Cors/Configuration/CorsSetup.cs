using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Infrastructure.Cors.Configuration;

/// <summary>
/// CORS lives only here, never in App Service's platform CORS (that would override it). The default policy allows the
/// configured frontend origins, GET/POST and the headers the frontend sends; no credentials and no wildcards.
/// </summary>
public static class CorsSetup
{
    private static readonly string[] AllowedHeaders =
    [
        "Authorization",
        "Content-Type",
        "X-Manage-Token",
        // W3C trace context, so a browser request can be followed end to end in App Insights.
        "traceparent",
        "tracestate",
    ];

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<CorsSettings>()
            .Bind(configuration.GetSection(CorsSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<CorsSettings>, CorsSettingsValidator>();

        services.AddCors();
        services.AddOptions<CorsOptions>()
            .Configure<IOptions<CorsSettings>>((options, settings) =>
                options.AddDefaultPolicy(policy => policy
                    .WithOrigins(settings.Value.AllowedOrigins)
                    .WithMethods(HttpMethods.Get, HttpMethods.Post)
                    .WithHeaders(AllowedHeaders)));
        return services;
    }
}
