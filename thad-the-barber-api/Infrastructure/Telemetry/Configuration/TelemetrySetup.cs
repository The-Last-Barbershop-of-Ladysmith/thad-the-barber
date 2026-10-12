using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;
using ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Configuration;

/// <summary>
/// OpenTelemetry to App Insights when <c>APPLICATIONINSIGHTS_CONNECTION_STRING</c> is set. The redacting processors are
/// added before Azure Monitor's exporters, and processors run in the order they're added, so nothing is exported
/// unredacted. Sampling stays at the distro's default (up to 5 traces per second, which keeps every trace at the shop's
/// traffic); the workspace's daily cap in Bicep bounds the cost.
/// </summary>
public static class TelemetrySetup
{
    public static IServiceCollection AddTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        OpenTelemetryBuilder telemetry = services.AddOpenTelemetry()
            .WithLogging(logging => logging.AddProcessor<RedactingLogProcessor>())
            .WithTracing(tracing => tracing.AddProcessor<RedactingSpanProcessor>());
        if (configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] is { Length: > 0 })
        {
            telemetry.UseAzureMonitor();
        }

        return services;
    }
}
