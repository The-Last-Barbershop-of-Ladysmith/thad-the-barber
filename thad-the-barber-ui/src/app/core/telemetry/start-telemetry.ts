import { NavigationEnd, Router } from '@angular/router';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { filter } from 'rxjs';
import { ErrorToastService } from './error-toast.service';
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

/** Runs after the first render, so the page the visitor landed on is tracked here and later ones on NavigationEnd. */
export function startTelemetry(
  settings: TelemetrySettings,
  router: Router,
  errorToast: ErrorToastService,
): void {
  const appInsights: ApplicationInsights = new ApplicationInsights({ config: telemetryConfig(settings) });
  appInsights.loadAppInsights();
  appInsights.addTelemetryInitializer(stripUrlQueries);
  errorToast.addReporter((error: unknown): void => {
    appInsights.trackException({ exception: error instanceof Error ? error : new Error(String(error)) });
  });
  trackPageView(appInsights, router.url);
  router.events
    .pipe(filter((event: unknown): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd): void => {
      trackPageView(appInsights, event.urlAfterRedirects);
    });
}
