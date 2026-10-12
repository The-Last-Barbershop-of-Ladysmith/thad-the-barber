using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;
using ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Configuration;

/// <summary>
/// OpenTelemetry to App Insights when <c>APPLICATIONINSIGHTS_CONNECTION_STRING</c> is set. The redacting processors are
/// added before Azure Monitor's exporters, and processors run in the order they're added, so nothing is exported
/// unredacted. In Azure, OpenTelemetry is the only log provider, so no log line skips redaction (the console would
/// write it to App Service's log stream as is); local runs keep the console. Sampling stays at the distro's default (up
/// to 5 traces per second, which keeps every trace at the shop's traffic); the workspace's daily cap in Bicep bounds
/// the cost.
/// </summary>
public static class TelemetrySetup
{
    public static IHostApplicationBuilder AddTelemetry(this IHostApplicationBuilder builder)
    {
        bool isAppInsightsConfigured = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] is { Length: > 0 };
        if (isAppInsightsConfigured)
        {
            // Before OpenTelemetry is added: clearing afterwards would remove its provider too.
            builder.Logging.ClearProviders();
        }

        OpenTelemetryBuilder telemetry = builder.Services.AddOpenTelemetry()
            .WithLogging(logging => logging.AddProcessor<RedactingLogProcessor>())
            .WithTracing(tracing => tracing.AddProcessor<RedactingSpanProcessor>());
        if (isAppInsightsConfigured)
        {
            telemetry.UseAzureMonitor();
        }

        return builder;
    }
}
