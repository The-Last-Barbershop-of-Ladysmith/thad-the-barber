// Ships in the public bundle: never add a secret here (secrets live in the API's Key Vault).
export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  siteUrl: string;
  mediaBaseUrl: string;
  recaptchaSiteKey: string;
  appInsightsConnectionString: string;
}
