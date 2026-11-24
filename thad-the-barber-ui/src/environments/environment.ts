import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiBaseUrl: 'https://api.cutsbythad.com/api',
  siteUrl: 'https://cutsbythad.com',
  mediaBaseUrl: 'https://storttbprodeastus.blob.core.windows.net/media-prod',
  recaptchaSiteKey: '6LckrCcuAAAAAMWMEA6Ia32VITcrp_4RDdu5Ipx0',
  staticMapApiKey: 'AIzaSyAY_UceiUsEtgAlBBceYVO-HeXex65bWdU',
  staticMapId: '234d0df10aa5c1f753283583',
  appInsightsConnectionString: 'InstrumentationKey=7dfe3051-4e10-44e7-ba19-69a82142a5d0;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=61036d64-1d82-4478-bdb6-c016e01a33ae',
};
