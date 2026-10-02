/**
 * Build-time settings for one environment. Everything here ships in the public bundle, so nothing
 * secret belongs in it (secrets live in the API's Key Vault).
 */
export interface Environment {
  production: boolean;
  /** Absolute API base including `/api`, no trailing slash. Build request URLs with `apiUrl()`. */
  apiBaseUrl: string;
  /** Canonical site origin, no trailing slash (canonical links, sitemap, reCAPTCHA hostname). */
  siteUrl: string;
  /** This environment's Blob media container, no trailing slash. */
  mediaBaseUrl: string;
  /** Public reCAPTCHA v3 site key. Empty until reCAPTCHA is set up. */
  recaptchaSiteKey: string;
  /** App Insights browser connection string. Empty until browser telemetry (#121). */
  appInsightsConnectionString: string;
}
