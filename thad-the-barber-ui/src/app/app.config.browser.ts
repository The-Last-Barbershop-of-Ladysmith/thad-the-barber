import { DOCUMENT, ViewportScroller } from '@angular/common';
import { ApplicationConfig, inject, mergeApplicationConfig, provideEnvironmentInitializer } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { provideTelemetry } from './core/telemetry/provide-telemetry';
import { holdFirstAnchor } from './shared/utils/hold-anchor.utils';

const browserConfig: ApplicationConfig = {
  providers: [
    provideTelemetry(environment),
    provideEnvironmentInitializer((): void => {
      holdFirstAnchor(
        inject(DOCUMENT),
        inject(Router),
        inject(ViewportScroller),
      );
    }),
  ],
};

export const config: ApplicationConfig = mergeApplicationConfig(appConfig, browserConfig);
