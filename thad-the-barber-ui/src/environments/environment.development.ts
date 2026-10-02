import { type Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5078/api',
  siteUrl: 'http://localhost:4200',
  mediaBaseUrl: 'https://storttbnonprodcentralus.blob.core.windows.net/media-dev',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
