import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneLinks } from '../../../../core/models/shop/phone-links.model';
import { BookingSummary } from './booking-summary';

describe(
  'BookingSummary',
  (): void => {
    const phone: PhoneLinks = {
      display: '(000) 555-01x9',
      tel: 'tel:+10005550109',
      sms: 'sms:+10005550109',
    };

    function render(isBotCheckFailed: boolean): HTMLElement {
      const fixture: ComponentFixture<BookingSummary> = TestBed.createComponent(BookingSummary);
      fixture.componentRef.setInput('rows', []);
      fixture.componentRef.setInput('phone', phone);
      fixture.componentRef.setInput('isBotCheckFailed', isBotCheckFailed);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function confirmButton(host: HTMLElement): HTMLButtonElement | null {
      return host.querySelector<HTMLButtonElement>('[data-testid="confirm-booking"]');
    }

    it(
      'offers call and text links and turns off confirming when the bot check failed',
      (): void => {
        const host: HTMLElement = render(true);

        expect(host.querySelector('[data-testid="bot-check-failed"]')).not.toBeNull();
        expect(host.querySelector('[data-testid="bot-check-call"]')?.getAttribute('href')).toBe(phone.tel);
        expect(host.querySelector('[data-testid="bot-check-text"]')?.getAttribute('href')).toBe(phone.sms);
        expect(confirmButton(host)?.disabled).toBe(true);
      },
    );

    it(
      'shows no fallback while the bot check is fine',
      (): void => {
        const host: HTMLElement = render(false);

        expect(host.querySelector('[data-testid="bot-check-failed"]')).toBeNull();
        expect(confirmButton(host)?.disabled).toBe(false);
      },
    );

    it(
      "links Google's privacy policy and terms in place of the hidden reCAPTCHA badge",
      (): void => {
        const hrefs: (string | null)[] = Array.from(render(false).querySelectorAll('a'))
          .map((link: HTMLAnchorElement): string | null => link.getAttribute('href'));

        expect(hrefs).toEqual(['https://policies.google.com/privacy', 'https://policies.google.com/terms']);
      },
    );
  },
);
