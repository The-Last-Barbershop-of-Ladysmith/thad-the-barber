import { TelemetrySettings } from '../app/core/telemetry/telemetry-settings.model';

export const TEST_TELEMETRY_SETTINGS: TelemetrySettings = {
  appInsightsConnectionString: 'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://ingest.example.com/',
  apiBaseUrl: 'https://api.example.com/api',
};
