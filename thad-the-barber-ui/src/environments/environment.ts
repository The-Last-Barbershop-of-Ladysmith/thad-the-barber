import { Environment } from './environment.model';

// Prod resources come at M5; these follow the planned names until the custom domain replaces them.
export const environment: Environment = {
  production: true,
  apiBaseUrl: 'https://as-ttb-api-prod-eastus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-prod-eastus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbprodeastus.blob.core.windows.net/media-prod',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
