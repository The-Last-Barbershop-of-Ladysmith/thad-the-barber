import {
  EnvironmentProviders,
  Injector,
  afterNextRender,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { Router } from '@angular/router';
import { ErrorToastService } from './error-toast.service';
import * as StartTelemetry from './start-telemetry';
import { TelemetrySettings } from './telemetry-settings.model';

/**
 * App Insights in the browser: page views, exceptions and API dependencies. No-op without a connection string.
 * The SDK is about a fifth of the startup JavaScript, so it loads after the first render, not before it.
 */
export function provideTelemetry(settings: TelemetrySettings): EnvironmentProviders {
  if (!settings.appInsightsConnectionString) {
    return makeEnvironmentProviders([]);
  }
  return makeEnvironmentProviders([
    provideAppInitializer((): void => {
      const router: Router = inject(Router);
      const errorToast: ErrorToastService = inject(ErrorToastService);
      const injector: Injector = inject(Injector);
      afterNextRender(
        (): void => {
          void import('./start-telemetry').then((telemetry: typeof StartTelemetry): void => {
            telemetry.startTelemetry(
              settings,
              router,
              errorToast,
            );
          });
        },
        { injector },
      );
    }),
  ]);
}
