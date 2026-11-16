import { DistributedTracingModes, IConfig, IConfiguration } from '@microsoft/applicationinsights-web';
import { telemetryConfig } from './telemetry-config';
import { TelemetrySettings } from './telemetry-settings.model';

const SETTINGS: TelemetrySettings = {
  appInsightsConnectionString: 'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://ingest.example.com/',
  apiBaseUrl: 'https://api.example.com/api',
};

describe(
  'telemetryConfig',
  (): void => {
    let config: IConfiguration & IConfig;

    beforeEach((): void => {
      config = telemetryConfig(SETTINGS);
    });

    it(
      'leaves page views to the router subscription and errors to the ErrorHandler',
      (): void => {
        expect(config.enableAutoRouteTracking).toBe(false);
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
