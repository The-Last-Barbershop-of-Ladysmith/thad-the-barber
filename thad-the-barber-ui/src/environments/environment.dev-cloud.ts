import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  isComingSoon: false,
  isBookingPreview: false,
  apiBaseUrl: 'https://as-ttb-api-dev-eastus.azurewebsites.net/api',
  siteUrl: 'https://as-ttb-ui-dev-eastus.azurewebsites.net',
  mediaBaseUrl: 'https://storttbnonprodeastus.blob.core.windows.net/media-dev',
  recaptchaSiteKey: '6LfdeugtAAAAAH8ctabtu7arVmL3hMAp9Uxad6Dp',
  staticMapApiKey: 'AIzaSyAY_UceiUsEtgAlBBceYVO-HeXex65bWdU',
  staticMapId: '234d0df10aa5c1f753283583',
  appInsightsConnectionString: 'InstrumentationKey=5160f25b-b732-4bd9-a1df-7ce07ff94f6e;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=97305979-73e6-4655-bb59-346625847de8',
};
