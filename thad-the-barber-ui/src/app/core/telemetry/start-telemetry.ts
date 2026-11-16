import { NavigationEnd, Router } from '@angular/router';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { filter } from 'rxjs';
import { ExceptionReporter } from './exception-reporter';
import { stripUrlQueries } from './strip-url-queries';
import { telemetryConfig } from './telemetry-config';
import { TelemetrySettings } from './telemetry-settings.model';

function trackPageView(appInsights: ApplicationInsights, urlAfterRedirects: string): void {
  const url: URL = new URL(urlAfterRedirects, window.location.origin);
  const trace: ReturnType<ApplicationInsights['getTraceCtx']> = appInsights.getTraceCtx();
  if (trace) {
    trace.traceId = crypto.randomUUID().replaceAll('-', '');
    trace.pageName = url.pathname;
  }
  appInsights.trackPageView({ uri: url.href });
}

/** Runs after the first render: a landing page that has already loaded is tracked here, the rest on NavigationEnd. */
export function startTelemetry(
  settings: TelemetrySettings,
  router: Router,
  exceptionReporter: ExceptionReporter,
): void {
  const appInsights: ApplicationInsights = new ApplicationInsights({ config: telemetryConfig(settings) });
  appInsights.loadAppInsights();
  appInsights.addTelemetryInitializer(stripUrlQueries);
  exceptionReporter.report = (error: unknown): void => {
    let exception: Error = new Error(String(error));
    if (error instanceof Error) {
      exception = error;
    }
    appInsights.trackException({ exception });
  };
  if (router.navigated) {
    trackPageView(appInsights, router.url);
  }
  router.events
    .pipe(filter((event: unknown): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd): void => {
      trackPageView(appInsights, event.urlAfterRedirects);
    });
}
