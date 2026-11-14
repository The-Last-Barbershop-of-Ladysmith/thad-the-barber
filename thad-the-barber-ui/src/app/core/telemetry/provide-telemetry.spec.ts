import { EnvironmentProviders, ErrorHandler, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { ToastMessageOptions, MessageService } from 'primeng/api';
import { Mock, MockInstance } from 'vitest';
import { shopFeature } from '../../features/shop/state/shop.feature';
import {
  AngularPlugin,
  ApplicationinsightsAngularpluginErrorService,
} from '@microsoft/applicationinsights-angularplugin-js';
import { DistributedTracingModes, IConfig, IConfiguration } from '@microsoft/applicationinsights-web';
import { TelemetrySettings, provideTelemetry, telemetryConfig } from './provide-telemetry';

const SETTINGS: TelemetrySettings = {
  appInsightsConnectionString: 'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://ingest.example.com/',
  apiBaseUrl: 'https://api.example.com/api',
};

const add: Mock<(message: ToastMessageOptions) => void> = vi.fn();

/** What the error toast needs: the shop's phone from the store, and somewhere to show the toast. */
const TOAST_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  provideStore({ [shopFeature.name]: shopFeature.reducer }),
  { provide: MessageService, useValue: { add } },
];

/** The plugin keeps the loaded SDK in a private field; it is only set once App Insights has loaded. */
interface WiredErrorService { analyticsPlugin?: unknown; }

function wiredPlugin(): unknown {
  return (TestBed.inject(ApplicationinsightsAngularpluginErrorService) as unknown as WiredErrorService).analyticsPlugin;
}

describe(
  'provideTelemetry',
  (): void => {
    beforeEach((): void => {
      add.mockClear();
    });

    it(
      'does not load the SDK when the connection string is empty',
      (): void => {
        const settings: TelemetrySettings = { ...SETTINGS, appInsightsConnectionString: '' };
        TestBed.configureTestingModule({ providers: [provideRouter([]), provideTelemetry(settings)] });

        expect(TestBed.inject(ErrorHandler)).not.toBeInstanceOf(ApplicationinsightsAngularpluginErrorService);
        expect(wiredPlugin()).toBeUndefined();
      },
    );

    it(
      'loads the SDK and routes errors through the plugin when a connection string is set',
      (): void => {
        TestBed.configureTestingModule({
          providers: [
            provideRouter([]),
            TOAST_PROVIDERS,
            provideTelemetry(SETTINGS),
          ],
        });

        expect(TestBed.inject(ErrorHandler)).toBeInstanceOf(ApplicationinsightsAngularpluginErrorService);
        expect(wiredPlugin()).toBeDefined();
      },
    );

    it(
      'shows the friendly error toast for an uncaught error, once per error',
      (): void => {
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        TestBed.configureTestingModule({
          providers: [
            provideRouter([]),
            TOAST_PROVIDERS,
            provideTelemetry(SETTINGS),
          ],
        });

        TestBed.inject(ErrorHandler).handleError(new Error('boom'));

        expect(add).toHaveBeenCalledTimes(1);
        expect(add.mock.calls[0]?.[0].severity).toBe('error');
      },
    );

    it(
      'keeps logging errors to the console',
      (): void => {
        const consoleError: MockInstance<typeof console.error> = vi.spyOn(console, 'error').mockReturnValue(undefined);
        const error: Error = new Error('boom');
        TestBed.configureTestingModule({
          providers: [
            provideRouter([]),
            TOAST_PROVIDERS,
            provideTelemetry(SETTINGS),
          ],
        });

        TestBed.inject(ErrorHandler).handleError(error);

        expect(consoleError).toHaveBeenCalledExactlyOnceWith('ERROR', error);
        consoleError.mockRestore();
      },
    );
  },
);

describe(
  'telemetryConfig',
  (): void => {
    let plugin: AngularPlugin;
    let config: IConfiguration & IConfig;

    beforeEach((): void => {
      plugin = new AngularPlugin();
      config = telemetryConfig(SETTINGS, plugin);
    });

    it(
      'leaves page views to the router subscription',
      (): void => {
        expect(config.enableAutoRouteTracking).toBe(false);
        expect(config.extensionConfig?.[plugin.identifier]).not.toHaveProperty('router');
      },
    );

    it(
      'loads the Angular plugin for errors',
      (): void => {
        expect(config.extensions).toEqual([plugin]);
        expect(config.disableExceptionTracking).toBe(true);
      },
    );

    it(
      'never fetches config from the CDN',
      (): void => {
        expect(config.extensionConfig?.['AppInsightsCfgSyncPlugin']).toEqual({ blkCdnCfg: true });
      },
    );

    it(
      'sets no cookies',
      (): void => {
        expect(config.disableCookiesUsage).toBe(true);
      },
    );

    it(
      'skips the deprecated unload event',
      (): void => {
        expect(config.disablePageUnloadEvents).toEqual(['unload']);
      },
    );

    it(
      'links traces with W3C headers to the API host only',
      (): void => {
        expect(config.distributedTracingMode).toBe(DistributedTracingModes.W3C);
        expect(config.enableCorsCorrelation).toBe(true);
        expect(config.correlationHeaderDomains).toEqual(['api.example.com']);
      },
    );
  },
);
