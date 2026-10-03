import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5078/api',
  siteUrl: 'http://localhost:4200',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-dev',
  recaptchaSiteKey: '',
  appInsightsConnectionString: 'InstrumentationKey=e98a89ed-6192-4b0c-9cf6-322a6f9d5e29;IngestionEndpoint=https://centralus-2.in.applicationinsights.azure.com/;LiveEndpoint=https://centralus.livediagnostics.monitor.azure.com/;ApplicationId=4bc47276-55a1-4e2b-b416-e2aacd02aac2',
};
