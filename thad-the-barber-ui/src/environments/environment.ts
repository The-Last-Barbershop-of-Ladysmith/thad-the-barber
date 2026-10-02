import { type Environment } from './environment.model';

/**
 * Production (`ng build`, `-c production`). The prod resources don't exist yet (M5); these follow the
 * `<type>-ttb-prod-eastus` naming and switch to the custom domain (site, `api.<domain>`) at launch.
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: 'https://as-ttb-api-prod-eastus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-prod-eastus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbprodeastus.blob.core.windows.net/media-prod',
  recaptchaSiteKey: '',
  appInsightsConnectionString: '',
};
