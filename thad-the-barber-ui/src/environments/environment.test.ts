import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  isComingSoon: false,
  apiBaseUrl: 'https://as-ttb-api-test-eastus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-test-eastus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodeastus.blob.core.windows.net/media-test',
  recaptchaSiteKey: '6LeOqegtAAAAAHPAYbWC8oZAUOo7kki8X1OfYHdZ',
  staticMapApiKey: 'AIzaSyAY_UceiUsEtgAlBBceYVO-HeXex65bWdU',
  staticMapId: '234d0df10aa5c1f753283583',
  appInsightsConnectionString: 'InstrumentationKey=32cc6bf9-4c07-4ffd-baed-9319e6620dfd;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=0f36fbf3-97f0-4a24-ba4e-e6a8e77bb72d',
};
