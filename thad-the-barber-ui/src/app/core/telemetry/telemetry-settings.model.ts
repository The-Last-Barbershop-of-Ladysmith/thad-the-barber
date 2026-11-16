import { Environment } from '../../../environments/environment.model';

export type TelemetrySettings = Pick<Environment, 'appInsightsConnectionString' | 'apiBaseUrl'>;
