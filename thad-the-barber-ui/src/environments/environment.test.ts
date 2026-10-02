import { type Environment } from './environment.model';

/** Azure test (`ng build -c test`), built by the release workflow. */
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'https://as-ttb-api-test-centralus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-test-centralus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-test',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
