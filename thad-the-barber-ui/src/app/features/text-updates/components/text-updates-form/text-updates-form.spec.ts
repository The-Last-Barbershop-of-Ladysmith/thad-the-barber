import { ComponentFixture, TestBed } from '@angular/core/testing';
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

describe(
  'TextUpdatesForm',
  (): void => {
    let subscribe: Mock<(phone: string) => Observable<{ phone: string; }>>;

    function render(isComingSoon: boolean): ComponentFixture<TextUpdatesForm> {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: SmsSignupService, useValue: { subscribe } },
          { provide: IS_COMING_SOON, useValue: isComingSoon },
        ],
      });
      const fixture: ComponentFixture<TextUpdatesForm> = TestBed.createComponent(TextUpdatesForm);
      fixture.detectChanges();
      return fixture;
    }

    function query<T extends HTMLElement>(fixture: ComponentFixture<TextUpdatesForm>, testId: string): T | null {
      return (fixture.nativeElement as HTMLElement).querySelector<T>(`[data-testid="${testId}"]`);
    }

    function fillIn(fixture: ComponentFixture<TextUpdatesForm>, hasConsent: boolean): void {
      const form: TextUpdatesForm['signupForm'] = fixture.componentInstance['signupForm'];
      form.controls.phone.setValue(MADE_UP_PHONE);
      form.controls.hasConsent.setValue(hasConsent);
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
            const fixture: ComponentFixture<TextUpdatesForm> = render(false);
            const button: HTMLButtonElement | null = query<HTMLButtonElement>(fixture, 'text-updates-submit');
            expect(button?.disabled).toBe(true);

            fillIn(fixture, false);
            expect(button?.disabled).toBe(true);

            fillIn(fixture, true);
            expect(button?.disabled).toBe(false);
          },
        );

        it(
          'shows the consent unticked, with its rates, STOP and terms wording',
          (): void => {
            const fixture: ComponentFixture<TextUpdatesForm> = render(false);
            const box: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
              .querySelector<HTMLInputElement>('#text-updates-consent');
            const label: string = (fixture.nativeElement as HTMLElement)
              .querySelector('label[for="text-updates-consent"]')?.textContent ?? '';

            expect(box?.checked).toBe(false);
            expect(label).toContain('Message and data rates may apply');
            expect(label).toContain('Reply STOP to opt out');
            expect(label).toContain('not needed to book');
          },
        );

        it(
          'sends the phone as E.164 and then thanks the customer',
          (): void => {
            const fixture: ComponentFixture<TextUpdatesForm> = render(false);
            fillIn(fixture, true);

            fixture.componentInstance['submit']();
            fixture.detectChanges();

            expect(subscribe).toHaveBeenCalledExactlyOnceWith(MADE_UP_PHONE_E164);
            expect(query(fixture, 'text-updates-done')).not.toBeNull();
            expect(query(fixture, 'text-updates-form')).toBeNull();
          },
        );

        it(
          'says so and lets the customer try again when the sign-up fails',
          (): void => {
            subscribe.mockReturnValue(throwError((): Error => new Error('made-up failure')));
            const fixture: ComponentFixture<TextUpdatesForm> = render(false);
            fillIn(fixture, true);

            fixture.componentInstance['submit']();
            fixture.detectChanges();

            expect(query(fixture, 'text-updates-error')).not.toBeNull();
            expect(query<HTMLButtonElement>(fixture, 'text-updates-submit')?.disabled).toBe(false);
          },
        );

        it(
          'sends nothing while the consent box is unticked',
          (): void => {
            const fixture: ComponentFixture<TextUpdatesForm> = render(false);
            fillIn(fixture, false);

            fixture.componentInstance['submit']();

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
            const fixture: ComponentFixture<TextUpdatesForm> = render(true);

            expect(query(fixture, 'text-updates-coming-soon')).not.toBeNull();
            expect(fixture.componentInstance['signupForm'].disabled).toBe(true);
            expect(query<HTMLButtonElement>(fixture, 'text-updates-submit')?.disabled).toBe(true);
          },
        );

        it(
          'still shows the consent wording a reviewer needs to read',
          (): void => {
            const fixture: ComponentFixture<TextUpdatesForm> = render(true);
            const label: string = (fixture.nativeElement as HTMLElement)
              .querySelector('label[for="text-updates-consent"]')?.textContent ?? '';

            expect(label).toContain('Reply STOP to opt out');
          },
        );

        it(
          'sends nothing even when submitted',
          (): void => {
            const fixture: ComponentFixture<TextUpdatesForm> = render(true);

            fixture.componentInstance['submit']();

            expect(subscribe).not.toHaveBeenCalled();
          },
        );
      },
    );
  },
);
