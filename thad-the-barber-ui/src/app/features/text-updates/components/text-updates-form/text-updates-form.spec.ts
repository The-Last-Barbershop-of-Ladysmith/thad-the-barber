import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';
import { IS_COMING_SOON } from '../../../../core/config/coming-soon.token';
import { shopFeature } from '../../../shop/state/shop.feature';
import { SmsSignupService } from '../../services/sms-signup.service';
import { TextUpdatesForm } from './text-updates-form';

const MADE_UP_PHONE: string = '(555) 010-0142';
const MADE_UP_PHONE_E164: string = '+15550100142';

interface TextUpdatesFormPage {
  signupForm: FormGroup<{
    phone: FormControl<string>;
    hasConsent: FormControl<boolean>;
  }>;
  submit(): void;
}

describe(
  'TextUpdatesForm',
  (): void => {
    let subscribe: Mock<(phone: string) => Observable<{ phone: string; }>>;
    let fixture: ComponentFixture<TextUpdatesForm>;
    let page: TextUpdatesFormPage;

    function render(isComingSoon: boolean): void {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: SmsSignupService, useValue: { subscribe } },
          { provide: IS_COMING_SOON, useValue: isComingSoon },
        ],
      });
      fixture = TestBed.createComponent(TextUpdatesForm);
      page = fixture.componentInstance as unknown as TextUpdatesFormPage;
      fixture.detectChanges();
    }

    function element(testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    function submitButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('[data-testid="text-updates-submit"]');
    }

    function consentLabel(): string {
      return (fixture.nativeElement as HTMLElement)
        .querySelector('label[for="text-updates-consent"]')?.textContent ?? '';
    }

    function fillIn(hasConsent: boolean): void {
      page.signupForm.controls.phone.setValue(MADE_UP_PHONE);
      page.signupForm.controls.hasConsent.setValue(hasConsent);
      fixture.detectChanges();
    }

    beforeEach((): void => {
      subscribe = vi.fn((phone: string): Observable<{ phone: string; }> => of({ phone }));
    });

    describe(
      'when sign-up is open',
      (): void => {
        it(
          'keeps the sign-up button off until there is a phone and the box is ticked',
          (): void => {
            render(false);
            expect(submitButton()?.disabled).toBe(true);

            fillIn(false);
            expect(submitButton()?.disabled).toBe(true);

            fillIn(true);
            expect(submitButton()?.disabled).toBe(false);
          },
        );

        it(
          'shows the consent unticked, with its rates, STOP and terms wording',
          (): void => {
            render(false);
            const box: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
              .querySelector<HTMLInputElement>('#text-updates-consent');

            expect(box?.checked).toBe(false);
            expect(consentLabel()).toContain('Message and data rates may apply');
            expect(consentLabel()).toContain('Reply STOP to opt out');
            expect(consentLabel()).toContain('not needed to book');
          },
        );

        it(
          'sends the phone as E.164 and then thanks the customer',
          (): void => {
            render(false);
            fillIn(true);

            page.submit();
            fixture.detectChanges();

            expect(subscribe).toHaveBeenCalledExactlyOnceWith(MADE_UP_PHONE_E164);
            expect(element('text-updates-done')).not.toBeNull();
            expect(element('text-updates-form')).toBeNull();
          },
        );

        it(
          'says so and lets the customer try again when the sign-up fails',
          (): void => {
            subscribe.mockReturnValue(throwError((): Error => new Error('made-up failure')));
            render(false);
            fillIn(true);

            page.submit();
            fixture.detectChanges();

            expect(element('text-updates-error')).not.toBeNull();
            expect(submitButton()?.disabled).toBe(false);
          },
        );

        it(
          'sends nothing while the consent box is unticked',
          (): void => {
            render(false);
            fillIn(false);

            page.submit();

            expect(subscribe).not.toHaveBeenCalled();
          },
        );
      },
    );

    describe(
      'while coming soon',
      (): void => {
        it(
          'says sign-up opens soon and switches the form off',
          (): void => {
            render(true);

            expect(element('text-updates-coming-soon')).not.toBeNull();
            expect(page.signupForm.disabled).toBe(true);
            expect(submitButton()?.disabled).toBe(true);
          },
        );

        it(
          'still shows the consent wording a reviewer needs to read',
          (): void => {
            render(true);

            expect(consentLabel()).toContain('Reply STOP to opt out');
          },
        );

        it(
          'sends nothing even when submitted',
          (): void => {
            render(true);

            page.submit();

            expect(subscribe).not.toHaveBeenCalled();
          },
        );
      },
    );
  },
);
