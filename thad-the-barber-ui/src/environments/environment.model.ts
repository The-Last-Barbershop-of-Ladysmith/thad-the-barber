export interface Environment {
  production: boolean;
  /** Prod before launch: bookings and the text updates sign-up are shown but switched off, with a coming-soon notice. */
  isComingSoon: boolean;
  apiBaseUrl: string;
  siteUrl: string;
  mediaBaseUrl: string;
  recaptchaSiteKey: string;
  staticMapApiKey: string;
  staticMapId: string;
  appInsightsConnectionString: string;
}
