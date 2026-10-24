/** The parts of Google's reCAPTCHA Enterprise script (`enterprise.js`) the site calls. */
export interface RecaptchaEnterprise {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string; }) => Promise<string>;
}

export interface RecaptchaWindow {
  grecaptcha?: {
    enterprise: RecaptchaEnterprise;
  };
}
