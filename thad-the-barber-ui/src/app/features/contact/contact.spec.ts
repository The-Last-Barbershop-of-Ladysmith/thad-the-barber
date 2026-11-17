import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navigation, Router, provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { Subject } from 'rxjs';
import { expectNoAxeViolations } from '../../../testing/axe';
import { TEST_SHOP } from '../../../testing/test-shop';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { AppState } from '../../store/app.state';
import * as ShopActions from '../shop/state/shop.actions';
import { shopFeature } from '../shop/state/shop.feature';
import { Contact } from './contact';
import { PAGE_OR_BOOKING_MAX_LENGTH } from './config/contact-limits';
import { CONTACT_PROBLEM_NOTICES } from './config/contact-notices';
import { ContactReceipt } from './dtos/contact-receipt.dto';
import { ContactRequest } from './dtos/contact-request.dto';
import { ContactCategory } from '../../shared/models/contact-category.model';
import { ContactPrefill } from '../../shared/models/contact-prefill.model';
import { ContactService } from './services/contact.service';

const MADE_UP_PHONE_FIELD_VALUE: string = '(555) 555-0123';

describe(
  'Contact',
  (): void => {
    let fixture: ComponentFixture<Contact>;
    let sentRequests: ContactRequest[];
    let responses: Subject<ContactReceipt>[];

    beforeEach((): void => {
      sentRequests = [];
      responses = [];
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          provideRouter([]),
          {
            provide: ContactService,
            useValue: {
              sendMessage: (request: ContactRequest): Subject<ContactReceipt> => {
                const response: Subject<ContactReceipt> = new Subject<ContactReceipt>();
                sentRequests.push(request);
                responses.push(response);
                return response;
              },
            },
          },
        ],
      });
      TestBed.inject<Store<AppState>>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
    });

    function openPage(prefill?: ContactPrefill): void {
      if (prefill) {
        vi.spyOn(TestBed.inject(Router), 'currentNavigation')
          .mockReturnValue({ extras: { state: prefill } } as unknown as Navigation);
      }
      fixture = TestBed.createComponent(Contact);
      fixture.detectChanges();
    }

    function byTestId(testId: string): HTMLElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    function inputByTestId(testId: string): HTMLInputElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
    }

    function textareaByTestId(testId: string): HTMLTextAreaElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(`[data-testid="${testId}"]`);
    }

    function buttonByTestId(testId: string): HTMLButtonElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    }

    function type(element: HTMLInputElement | HTMLTextAreaElement | null, text: string): void {
      if (!element) {
        throw new Error('No field to type in');
      }
      element.value = text;
      element.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function pickCategory(category: ContactCategory): void {
      const categoryOrder: ContactCategory[] = [
        ContactCategory.Question,
        ContactCategory.Issue,
        ContactCategory.Feedback,
      ];
      const choices: NodeListOf<HTMLElement> = (fixture.nativeElement as HTMLElement)
        .querySelectorAll<HTMLElement>('[data-testid="contact-category"] [role="button"]');
      choices[categoryOrder.indexOf(category)]?.click();
      fixture.detectChanges();
    }

    function typePhone(): void {
      const phoneInput: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('#contact-phone');
      // The input mask reads what was typed on a zero-delay timer.
      vi.useFakeTimers();
      type(phoneInput, MADE_UP_PHONE_FIELD_VALUE);
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
      fixture.detectChanges();
    }

    function requiredMarkCount(): number {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelectorAll('.required-mark').length;
    }

    function isSendDisabled(): boolean {
      return buttonByTestId('contact-send')?.disabled ?? true;
    }

    function submit(): void {
      byTestId('contact-form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    }

    function answer(result: ContactReceipt): void {
      responses.at(-1)?.next(result);
      responses.at(-1)?.complete();
      fixture.detectChanges();
    }

    function fail(code: string | null, status: number): void {
      responses.at(-1)?.error(new HttpErrorResponse({
        status,
        error: code ? { code } : null,
      }));
      fixture.detectChanges();
    }

    describe(
      'a question',
      (): void => {
        beforeEach((): void => {
          openPage();
        });

        it(
          'marks the message, name, email and phone as required',
          (): void => {
            const noteMark: number = 1;
            const requiredFields: number = 4;

            expect(requiredMarkCount()).toBe(noteMark + requiredFields);
          },
        );

        it(
          'cannot be sent without a message',
          (): void => {
            type(inputByTestId('contact-name'), 'Fake Person');
            type(inputByTestId('contact-email'), 'fake.person@example.test');

            expect(isSendDisabled()).toBe(true);
          },
        );

        it(
          'cannot be sent without a way to reply',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up question');
            type(inputByTestId('contact-name'), 'Fake Person');

            expect(isSendDisabled()).toBe(true);
          },
        );

        it(
          'cannot be sent with an email that is not one',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up question');
            type(inputByTestId('contact-name'), 'Fake Person');
            type(inputByTestId('contact-email'), 'not-an-email');

            expect(isSendDisabled()).toBe(true);
          },
        );

        it(
          'says nothing about the email while it is still being typed',
          (): void => {
            type(inputByTestId('contact-email'), 'not-an-email');

            expect(byTestId('contact-email')?.getAttribute('aria-invalid')).toBeNull();
          },
        );

        it(
          'links an email error to the field once it is left, and has no axe violations',
          async (): Promise<void> => {
            const email: HTMLInputElement | null = inputByTestId('contact-email');
            type(email, 'not-an-email');
            email?.dispatchEvent(new Event('blur'));
            fixture.detectChanges();

            const errorId: string | null = email?.getAttribute('aria-describedby') ?? null;
            expect(email?.getAttribute('aria-invalid')).toBe('true');
            expect(errorId).not.toBeNull();
            expect(fixture.nativeElement.querySelector(`#${errorId}`)).not.toBeNull();
            await expectNoAxeViolations(fixture.nativeElement);
          },
        );

        it(
          'is sent with a name and a phone, as E.164',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up question');
            type(inputByTestId('contact-name'), 'Fake Person');
            typePhone();
            submit();

            expect(sentRequests).toEqual([
              {
                category: ContactCategory.Question,
                message: 'Made-up question',
                name: 'Fake Person',
                phone: '+15555550123',
              },
            ]);
          },
        );
      },
    );

    describe(
      'feedback',
      (): void => {
        beforeEach((): void => {
          openPage();
          pickCategory(ContactCategory.Feedback);
        });

        it(
          'marks only the message as required',
          (): void => {
            const noteMark: number = 1;
            const requiredFields: number = 1;

            expect(requiredMarkCount()).toBe(noteMark + requiredFields);
          },
        );

        it(
          'can be sent anonymously',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up feedback');

            expect(isSendDisabled()).toBe(false);
          },
        );

        it(
          'does not ask for the page or booking',
          (): void => {
            expect(byTestId('contact-page-or-booking')).toBeNull();
          },
        );
      },
    );

    describe(
      'a problem report opened from an error notice',
      (): void => {
        beforeEach((): void => {
          openPage({
            category: ContactCategory.Issue,
            pageOrBooking: '/book',
          });
        });

        it(
          'also marks the page or booking as required',
          (): void => {
            const noteMark: number = 1;
            const requiredFields: number = 5;

            expect(requiredMarkCount()).toBe(noteMark + requiredFields);
          },
        );

        it(
          'is prefilled with the page it came from',
          (): void => {
            expect(inputByTestId('contact-page-or-booking')?.value).toBe('/book');
          },
        );

        it(
          'keeps a prefilled page within the length the API takes',
          (): void => {
            fixture.destroy();
            openPage({
              category: ContactCategory.Issue,
              pageOrBooking: `/${'a'.repeat(PAGE_OR_BOOKING_MAX_LENGTH * 2)}`,
            });

            expect(inputByTestId('contact-page-or-booking')?.value).toHaveLength(PAGE_OR_BOOKING_MAX_LENGTH);
          },
        );

        it(
          'is sent with the page or booking involved',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up problem');
            type(inputByTestId('contact-name'), 'Fake Person');
            type(inputByTestId('contact-email'), 'fake.person@example.test');
            submit();

            expect(sentRequests[0]).toEqual({
              category: ContactCategory.Issue,
              message: 'Made-up problem',
              name: 'Fake Person',
              email: 'fake.person@example.test',
              pageOrBooking: '/book',
            });
          },
        );

        it(
          'cannot be sent once the page or booking is cleared',
          (): void => {
            type(textareaByTestId('contact-message'), 'Made-up problem');
            type(inputByTestId('contact-name'), 'Fake Person');
            type(inputByTestId('contact-email'), 'fake.person@example.test');
            type(inputByTestId('contact-page-or-booking'), '');

            expect(isSendDisabled()).toBe(true);
          },
        );
      },
    );

    describe(
      'sending',
      (): void => {
        beforeEach((): void => {
          openPage();
          pickCategory(ContactCategory.Feedback);
          type(textareaByTestId('contact-message'), 'Made-up feedback');
          submit();
        });

        it(
          'locks the form and sends nothing twice',
          (): void => {
            submit();

            expect(textareaByTestId('contact-message')?.disabled).toBe(true);
            expect(isSendDisabled()).toBe(true);
            expect(sentRequests).toHaveLength(1);
          },
        );

        it(
          'replaces the form with a thank-you once it is sent',
          (): void => {
            answer({ id: 'made-up-receipt' });

            expect(byTestId('contact-sent')).not.toBeNull();
            expect(byTestId('contact-form')).toBeNull();
          },
        );

        it(
          'keeps the form and shows a notice when it fails',
          (): void => {
            fail(
              null,
              500,
            );

            expect(byTestId('contact-notice')).not.toBeNull();
            expect(textareaByTestId('contact-message')?.value).toBe('Made-up feedback');
            expect(isSendDisabled()).toBe(false);
          },
        );

        it(
          'shows its own notice for a rate limit',
          (): void => {
            fail(
              ProblemCode.RateLimited,
              429,
            );

            expect(byTestId('contact-notice')?.textContent).toContain(CONTACT_PROBLEM_NOTICES[ProblemCode.RateLimited]?.text);
          },
        );
      },
    );
  },
);
