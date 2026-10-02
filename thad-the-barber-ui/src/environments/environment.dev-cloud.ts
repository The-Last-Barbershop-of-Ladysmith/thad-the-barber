import { type Environment } from './environment.model';

/** Azure dev (`ng build -c devCloud`), deployed on merge into `dev/*`. */
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'https://as-ttb-api-dev-centralus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-dev-centralus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-dev',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
