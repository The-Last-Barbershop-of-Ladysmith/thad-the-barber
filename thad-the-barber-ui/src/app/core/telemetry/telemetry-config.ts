import { DistributedTracingModes, IConfig, IConfiguration } from '@microsoft/applicationinsights-web';
import { TelemetrySettings } from './telemetry-settings.model';

export function telemetryConfig(settings: TelemetrySettings): IConfiguration & IConfig {
  return {
    connectionString: settings.appInsightsConnectionString,
    disableCookiesUsage: true,
    // The unload event is deprecated (a Lighthouse best practice); the SDK still flushes on pagehide/visibilitychange.
    disablePageUnloadEvents: ['unload'],
    // The router subscription in startTelemetry tracks page views; the SDK's own tracking would count each route
    // change twice.
    enableAutoRouteTracking: false,
    // Exceptions arrive once, via the ErrorHandler; provideBrowserGlobalErrorListeners forwards window errors to it.
    disableExceptionTracking: true,
    distributedTracingMode: DistributedTracingModes.W3C,
    enableCorsCorrelation: true,
    correlationHeaderDomains: [new URL(settings.apiBaseUrl).host],
    // The SDK otherwise downloads feature flags from Microsoft's CDN, which the CSP blocks.
    extensionConfig: { AppInsightsCfgSyncPlugin: { blkCdnCfg: true } },
  };
}
