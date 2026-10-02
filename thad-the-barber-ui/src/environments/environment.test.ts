import { type Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'https://as-ttb-api-test-centralus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-test-centralus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-test',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
