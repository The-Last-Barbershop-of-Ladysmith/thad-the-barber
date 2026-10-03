import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { provideTelemetry } from './core/telemetry/provide-telemetry';

const browserConfig: ApplicationConfig = { providers: [provideTelemetry(environment)] };

export const config: ApplicationConfig = mergeApplicationConfig(appConfig, browserConfig);
