import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { SessionService } from '../../../../core/services/session.service';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../models/booking-confirmation.model';
import { BookingFormValue } from '../../models/booking-form-value.model';
import { BookingSummary } from './booking-summary';

interface SummaryInputs {
  isFormValid?: boolean;
  isBotCheckFailed?: boolean;
  confirmedBooking?: BookingConfirmation | null;
}

describe(
  'BookingSummary',
  (): void => {
    const filledIn: BookingFormValue = {
      name: 'Test Customer',
      phone: '(555) 010-0199',
      date: '2026-10-03',
      startAt: '2026-10-03T20:00:00Z',
    };
    const confirmedBooking: BookingConfirmation = {
      id: 'made-up-booking',
      startAt: '2026-10-03T20:00:00Z',
      manageToken: 'made-up-token',
    };
    let phone: PhoneLinks;
    let bookingUrl: string;

    function render(inputs: SummaryInputs = {}): HTMLElement {
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: SessionService, useValue: { isBotCheckFailed: signal(inputs.isBotCheckFailed ?? false) } },
        ],
      });
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      phone = store.selectSignal(shopFeature.selectPhoneLinks)();
      bookingUrl = store.selectSignal(shopFeature.selectBookingUrl)();
      const fixture: ComponentFixture<BookingSummary> = TestBed.createComponent(BookingSummary);
      fixture.componentRef.setInput('bookingFormValue', filledIn);
      fixture.componentRef.setInput('isFormValid', inputs.isFormValid ?? true);
      fixture.componentRef.setInput('isSubmitting', false);
      fixture.componentRef.setInput('confirmedBooking', inputs.confirmedBooking ?? null);
      fixture.componentRef.setInput('bookingNotice', null);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function confirmButton(host: HTMLElement): HTMLButtonElement | null {
      return host.querySelector<HTMLButtonElement>('[data-testid="confirm-booking"]');
    }

    it(
      'turns off confirming until the form is valid',
      (): void => {
        expect(confirmButton(render({ isFormValid: false }))?.disabled).toBe(true);
      },
    );

    it(
      'offers the Square booking site, call and text links and turns off confirming when the bot check failed',
      (): void => {
        const host: HTMLElement = render({ isBotCheckFailed: true });

        const botCheck: Element | null = host.querySelector('[data-testid="bot-check-failed"]');
        expect(botCheck?.querySelector('[data-testid="notice-booking-site"]')?.getAttribute('href')).toBe(bookingUrl);
        expect(botCheck?.querySelector('[data-testid="notice-call"]')?.getAttribute('href')).toBe(phone.tel);
        expect(botCheck?.querySelector('[data-testid="notice-text"]')?.getAttribute('href')).toBe(phone.sms);
        expect(confirmButton(host)?.disabled).toBe(true);
      },
    );

    it(
      'shows no fallback while the bot check is fine',
      (): void => {
        const host: HTMLElement = render();

        expect(host.querySelector('[data-testid="bot-check-failed"]')).toBeNull();
        expect(confirmButton(host)?.disabled).toBe(false);
      },
    );

    it(
      'confirms the booking with the phone it was sent to',
      (): void => {
        const host: HTMLElement = render({ confirmedBooking });

        expect(host.querySelector('[data-testid="booking-confirmation"]')?.textContent).toContain('(555) 010-0199');
      },
    );

    it(
      "links Google's privacy policy and terms in place of the hidden reCAPTCHA badge",
      (): void => {
        const hrefs: (string | null)[] = Array.from(render().querySelectorAll('.recaptcha-terms a'))
          .map((link: Element): string | null => link.getAttribute('href'));

        expect(hrefs).toEqual(['https://policies.google.com/privacy', 'https://policies.google.com/terms']);
      },
    );
  },
);
