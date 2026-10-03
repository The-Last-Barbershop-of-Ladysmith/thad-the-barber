import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'https://as-ttb-api-test-centralus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-test-centralus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-test',
  recaptchaSiteKey: '',
  appInsightsConnectionString: 'InstrumentationKey=f6cdc240-c8f5-4c58-b16b-9ccbc7c6a428;IngestionEndpoint=https://centralus-2.in.applicationinsights.azure.com/;LiveEndpoint=https://centralus.livediagnostics.monitor.azure.com/;ApplicationId=a756b90f-37aa-44f3-afe5-3c645209f0e1',
};
