import { TestBed } from '@angular/core/testing';
import { Mock } from 'vitest';
import { environment } from '../../../environments/environment';
import { RecaptchaEnterprise, RecaptchaWindow } from '../models/recaptcha.models';
import { RecaptchaService } from './recaptcha.service';

describe(
  'RecaptchaService',
  (): void => {
    const scriptSelector: string = 'script[src^="https://www.google.com/recaptcha/enterprise.js"]';

    function scripts(): HTMLScriptElement[] {
      return Array.from(document.querySelectorAll<HTMLScriptElement>(scriptSelector));
    }

    afterEach((): void => {
      scripts().forEach((script: HTMLScriptElement): void => {
        script.remove();
      });
      delete (window as RecaptchaWindow).grecaptcha;
    });

    it(
      'loads the Enterprise script once with the site key and runs the action',
      async (): Promise<void> => {
        const execute: Mock<RecaptchaEnterprise['execute']> = vi.fn((): Promise<string> => Promise.resolve('made-up-token'));
        const service: RecaptchaService = TestBed.inject(RecaptchaService);
        const first: Promise<string> = service.getToken('session');
        const second: Promise<string> = service.getToken('session');

        expect(scripts()).toHaveLength(1);
        expect(scripts()[0]?.src).toBe(`https://www.google.com/recaptcha/enterprise.js?render=${environment.recaptchaSiteKey}`);

        (window as RecaptchaWindow).grecaptcha = {
          enterprise: {
            ready: (callback: () => void): void => {
              callback();
            },
            execute,
          },
        };
        scripts()[0]?.dispatchEvent(new Event('load'));

        expect(await first).toBe('made-up-token');
        expect(await second).toBe('made-up-token');
        expect(execute).toHaveBeenCalledWith(environment.recaptchaSiteKey, { action: 'session' });
      },
    );

    it(
      'rejects when the script cannot load',
      async (): Promise<void> => {
        const token: Promise<string> = TestBed.inject(RecaptchaService).getToken('session');
        scripts()[0]?.dispatchEvent(new Event('error'));

        await expect(token).rejects.toThrow();
      },
    );

    it(
      'rejects when the script loads without the Enterprise API',
      async (): Promise<void> => {
        const token: Promise<string> = TestBed.inject(RecaptchaService).getToken('session');
        scripts()[0]?.dispatchEvent(new Event('load'));

        await expect(token).rejects.toThrow();
      },
    );
  },
);
