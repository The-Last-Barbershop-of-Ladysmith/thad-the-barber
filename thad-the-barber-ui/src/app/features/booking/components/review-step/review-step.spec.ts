import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { SessionService } from '../../../../core/services/session.service';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingFormValue } from '../../models/booking-form-value.model';
import { BookingStep } from '../../models/booking-step.model';
import { ReviewStep } from './review-step';

interface ReviewInputs {
  isFormValid?: boolean;
  isBotCheckFailed?: boolean;
}

describe(
  'ReviewStep',
  (): void => {
    const filledIn: BookingFormValue = {
      name: 'Test Customer',
      phone: '(555) 010-0199',
      date: '2026-10-03',
      startAt: '2026-10-03T20:00:00Z',
    };
    let fixture: ComponentFixture<ReviewStep>;

    function render(inputs: ReviewInputs = {}): HTMLElement {
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: SessionService, useValue: { isBotCheckFailed: signal(inputs.isBotCheckFailed ?? false) } },
        ],
      });
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      fixture = TestBed.createComponent(ReviewStep);
      fixture.componentRef.setInput('bookingFormValue', filledIn);
      fixture.componentRef.setInput('isFormValid', inputs.isFormValid ?? true);
      fixture.componentRef.setInput('isSubmitting', false);
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
      'turns off confirming when the bot check failed',
      (): void => {
        expect(confirmButton(render({ isBotCheckFailed: true }))?.disabled).toBe(true);
      },
    );

    it(
      'allows confirming while the bot check is fine',
      (): void => {
        expect(confirmButton(render())?.disabled).toBe(false);
      },
    );

    it(
      'lists every pick with a Change link to its step',
      (): void => {
        const host: HTMLElement = render();
        const changedSteps: BookingStep[] = [];
        fixture.componentInstance.changeStep.subscribe((step: BookingStep): void => {
          changedSteps.push(step);
        });

        host.querySelector<HTMLElement>('[data-testid="change-time"]')?.click();
        host.querySelector<HTMLElement>('[data-testid="change-phone"]')?.click();

        expect(host.querySelector('.summary-list')?.textContent).toContain('Saturday, October 3rd 2026');
        expect(changedSteps).toEqual([BookingStep.Time, BookingStep.Details]);
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
