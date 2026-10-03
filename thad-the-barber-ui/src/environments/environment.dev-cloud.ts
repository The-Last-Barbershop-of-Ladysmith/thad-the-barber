import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'https://as-ttb-api-dev-centralus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-dev-centralus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-dev',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
