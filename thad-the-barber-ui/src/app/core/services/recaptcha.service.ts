import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RecaptchaEnterprise, RecaptchaWindow } from '../models/recaptcha.models';

/**
 * Google's reCAPTCHA Enterprise score check. The keys are Enterprise keys (the API asks `createAssessment`), so the
 * script is `enterprise.js`, not the classic v3 `api.js`. It loads on first use, so pages that never call the API
 * never load it.
 */
@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly document: Document = inject(DOCUMENT);
  private loadedRecaptcha: Promise<RecaptchaEnterprise> | undefined;

  /** A token for `action`; rejects when the script can't load (blocked or offline), and tries again on the next call. */
  async getToken(action: string): Promise<string> {
    if (!this.loadedRecaptcha) {
      this.loadedRecaptcha = this.loadScript().catch((error: unknown): never => {
        this.loadedRecaptcha = undefined;
        throw error;
      });
    }
    const recaptcha: RecaptchaEnterprise = await this.loadedRecaptcha;
    return await recaptcha.execute(environment.recaptchaSiteKey, { action });
  }

  private loadScript(): Promise<RecaptchaEnterprise> {
    return new Promise<RecaptchaEnterprise>((
      resolve: (recaptcha: RecaptchaEnterprise) => void,
      reject: (reason: Error) => void,
    ): void => {
      const script: HTMLScriptElement = this.document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(environment.recaptchaSiteKey)}`;
      script.async = true;
      script.onload = (): void => {
        const recaptcha: RecaptchaEnterprise | undefined =
          (this.document.defaultView as RecaptchaWindow | null)?.grecaptcha?.enterprise;
        if (!recaptcha) {
          reject(new Error('reCAPTCHA loaded without grecaptcha.enterprise'));
          return;
        }
        recaptcha.ready((): void => {
          resolve(recaptcha);
        });
      };
      script.onerror = (): void => {
        script.remove();
        reject(new Error('reCAPTCHA failed to load'));
      };
      this.document.head.appendChild(script);
    });
  }
}
