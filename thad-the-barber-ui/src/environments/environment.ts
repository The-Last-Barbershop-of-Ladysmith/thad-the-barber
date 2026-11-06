import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiBaseUrl: 'https://as-ttb-api-prod-eastus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-prod-eastus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbprodeastus.blob.core.windows.net/media-prod',
  recaptchaSiteKey: '',
  staticMapApiKey: 'AIzaSyAY_UceiUsEtgAlBBceYVO-HeXex65bWdU',
  staticMapId: '234d0df10aa5c1f753283583',
  appInsightsConnectionString: '',
};
