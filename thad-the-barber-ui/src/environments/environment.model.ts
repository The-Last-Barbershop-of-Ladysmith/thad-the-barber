export interface Environment {
  production: boolean;
  /** Prod before launch: bookings and text updates sign-up are shown but switched off, with a coming-soon notice. */
  isComingSoon: boolean;
  /** Prod until online booking opens: the form works, but submitting only shows a toast that booking opens soon. */
  isBookingPreview: boolean;
  apiBaseUrl: string;
  siteUrl: string;
  mediaBaseUrl: string;
  recaptchaSiteKey: string;
  staticMapApiKey: string;
  staticMapId: string;
  appInsightsConnectionString: string;
}
