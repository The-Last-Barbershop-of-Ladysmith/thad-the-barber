import {
  EnvironmentProviders,
  ErrorHandler,
  Injector,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  AngularPlugin,
  ApplicationinsightsAngularpluginErrorService,
} from '@microsoft/applicationinsights-angularplugin-js';
import {
  ApplicationInsights,
  DistributedTracingModes,
  IConfig,
  IConfiguration,
} from '@microsoft/applicationinsights-web';
import { Environment } from '../../../environments/environment.model';
import { filter } from 'rxjs';
import { stripUrlQueries } from './strip-url-queries';

export type TelemetrySettings = Pick<Environment, 'appInsightsConnectionString' | 'apiBaseUrl'>;

export function telemetryConfig(settings: TelemetrySettings, angularPlugin: AngularPlugin): IConfiguration & IConfig {
  return {
    connectionString: settings.appInsightsConnectionString,
    disableCookiesUsage: true,
    // Page views are tracked on NavigationEnd below; the SDK's own tracking would count each route change twice.
    enableAutoRouteTracking: false,
    // Exceptions arrive once, via the ErrorHandler; provideBrowserGlobalErrorListeners forwards window errors to it.
    disableExceptionTracking: true,
    distributedTracingMode: DistributedTracingModes.W3C,
    enableCorsCorrelation: true,
    correlationHeaderDomains: [new URL(settings.apiBaseUrl).host],
    extensions: [angularPlugin],
    extensionConfig: {
      [angularPlugin.identifier]: {
        // Angular's default handler keeps logging uncaught errors to the console.
        errorServices: [new ErrorHandler()],
        // Wires the plugin to the injected error service even if nothing has resolved ErrorHandler yet.
        useInjector: true,
      },
      // The SDK otherwise downloads feature flags from Microsoft's CDN, which the CSP blocks.
      AppInsightsCfgSyncPlugin: { blkCdnCfg: true },
    },
  };
}

// Not the plugin's router tracking: it reads router.url before the first navigation ends, so it reports "/".
function trackPageViews(router: Router, appInsights: ApplicationInsights): void {
  router.events
    .pipe(filter((event: unknown): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd): void => {
      const url: URL = new URL(event.urlAfterRedirects, window.location.origin);
      // A new trace per page, as the plugin does, so each page's API calls form their own operation.
      const trace: ReturnType<ApplicationInsights['getTraceCtx']> = appInsights.getTraceCtx();
      if (trace) {
        trace.traceId = crypto.randomUUID().replaceAll('-', '');
        trace.pageName = url.pathname;
      }
      appInsights.trackPageView({ uri: url.href });
    });
}

/** App Insights in the browser: page views, exceptions and API dependencies. No-op without a connection string. */
export function provideTelemetry(settings: TelemetrySettings): EnvironmentProviders {
  if (!settings.appInsightsConnectionString) {
    return makeEnvironmentProviders([]);
  }
  return makeEnvironmentProviders([
    { provide: ErrorHandler, useExisting: ApplicationinsightsAngularpluginErrorService },
    provideAppInitializer((): void => {
      const angularPlugin: AngularPlugin = new AngularPlugin(inject(Injector));
      const config: IConfiguration & IConfig = telemetryConfig(settings, angularPlugin);
      const appInsights: ApplicationInsights = new ApplicationInsights({ config });
      appInsights.loadAppInsights();
      appInsights.addTelemetryInitializer(stripUrlQueries);
      trackPageViews(inject(Router), appInsights);
    }),
  ]);
}
