import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { Subject } from 'rxjs';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { FoundBooking } from '../../dtos/found-booking.dto';
import { LookupCodeRequest } from '../../dtos/lookup-code-request.dto';
import { VerifiedListRequest } from '../../dtos/verified-list-request.dto';
import { BookingService } from '../../services/booking.service';
import { FindBookings } from './find-bookings';

const MADE_UP_PHONE_FIELD_VALUE: string = '(555) 555-0123';

const foundBookings: FoundBooking[] = [
  {
    id: 'made-up/first',
    startAt: '2030-10-03T20:00:00Z',
    manageToken: 'made+up/first=token',
  },
  {
    id: 'made-up-second',
    startAt: '2030-10-04T23:30:00Z',
    manageToken: 'made-up-second-token',
  },
];

describe(
  'FindBookings',
  (): void => {
    let fixture: ComponentFixture<FindBookings>;
    let codeRequests: LookupCodeRequest[];
    let codeResponses: Subject<null>[];
    let verifiedListRequests: VerifiedListRequest[];
    let verifiedListResponses: Subject<FoundBooking[]>[];

    beforeEach((): void => {
      codeRequests = [];
      codeResponses = [];
      verifiedListRequests = [];
      verifiedListResponses = [];
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          provideRouter([]),
          {
            provide: BookingService,
            useValue: {
              sendLookupCode: (request: LookupCodeRequest): Subject<null> => {
                const response: Subject<null> = new Subject<null>();
                codeRequests.push(request);
                codeResponses.push(response);
                return response;
              },
              getVerifiedList: (request: VerifiedListRequest): Subject<FoundBooking[]> => {
                const response: Subject<FoundBooking[]> = new Subject<FoundBooking[]>();
                verifiedListRequests.push(request);
                verifiedListResponses.push(response);
                return response;
              },
            },
          },
        ],
      });
      TestBed.inject<Store<AppState>>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      fixture = TestBed.createComponent(FindBookings);
      fixture.detectChanges();
    });

    function byTestId(testId: string): HTMLElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    function buttonByTestId(testId: string): HTMLButtonElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    }

    function inputByTestId(testId: string): HTMLInputElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
    }

    function type(input: HTMLInputElement, text: string): void {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function typePhone(): void {
      const phoneInput: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('#lookup-phone');
      if (!phoneInput) {
        throw new Error('No phone input');
      }
      // The input mask reads what was typed on a zero-delay timer.
      vi.useFakeTimers();
      type(phoneInput, MADE_UP_PHONE_FIELD_VALUE);
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
      fixture.detectChanges();
    }

    function submit(): void {
      byTestId('lookup-form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    }

    function answerCode(): void {
      const response: Subject<null> | undefined = codeResponses.at(-1);
      response?.next(null);
      response?.complete();
      fixture.detectChanges();
    }

    function answerVerifiedList(answer: FoundBooking[]): void {
      const response: Subject<FoundBooking[]> | undefined = verifiedListResponses.at(-1);
      response?.next(answer);
      response?.complete();
      fixture.detectChanges();
    }

    function failVerifiedList(code: ProblemCode): void {
      verifiedListResponses.at(-1)?.error(new HttpErrorResponse({ status: 400, error: { code } }));
      fixture.detectChanges();
    }

    function openCodeStep(): HTMLInputElement {
      typePhone();
      submit();
      answerCode();
      const codeInput: HTMLInputElement | null = inputByTestId('lookup-code');
      if (!codeInput) {
        throw new Error('No code input');
      }
      return codeInput;
    }

    it(
      'starts empty on the phone step, with nothing to send',
      (): void => {
        expect(buttonByTestId('send-code')?.disabled).toBe(true);
        expect(byTestId('lookup-code')).toBeNull();
        expect(codeRequests).toEqual([]);
      },
    );

    it(
      'sends the code to the phone in E.164 once it is complete',
      (): void => {
        typePhone();

        expect(buttonByTestId('send-code')?.disabled).toBe(false);
        submit();

        expect(codeRequests).toEqual([{ phone: '+15555550123' }]);
      },
    );

    it(
      'sends nothing a second time while the first request is sent',
      (): void => {
        typePhone();
        submit();
        submit();

        expect(codeRequests).toHaveLength(1);
      },
    );

    it(
      'shows the code step once the code is sent, and keeps only digits of what is typed',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '12 3-4a5');

        expect(codeInput.value).toBe('12345');
        expect(byTestId('code-sent-to')?.textContent).toContain(MADE_UP_PHONE_FIELD_VALUE);
      },
    );

    it(
      'verifies only a code of 4 to 10 digits, with the phone it was sent to',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '123');
        expect(buttonByTestId('verify-code')?.disabled).toBe(true);

        type(codeInput, '0042');

        expect(buttonByTestId('verify-code')?.disabled).toBe(false);
        submit();
        expect(verifiedListRequests).toEqual([{ phone: '+15555550123', code: '0042' }]);
      },
    );

    it(
      'locks the inputs and both actions while a request is sent',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();

        expect(codeInput.disabled).toBe(true);
        expect(buttonByTestId('verify-code')?.disabled).toBe(true);
        expect(buttonByTestId('resend-code')?.disabled).toBe(true);
        expect(buttonByTestId('change-phone')?.disabled).toBe(true);
      },
    );

    it(
      'leaves a wrong code to retry: the notice shows and the code field is open again, as typed',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();
        failVerifiedList(ProblemCode.CodeInvalid);

        expect(byTestId('lookup-notice')).not.toBeNull();
        expect(codeInput.disabled).toBe(false);
        expect(codeInput.value).toBe('0042');
        expect(buttonByTestId('verify-code')?.disabled).toBe(false);
      },
    );

    it(
      'puts focus back on the code field when a request fails and the form unlocks',
      async (): Promise<void> => {
        document.body.append(fixture.nativeElement as HTMLElement);
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();
        await fixture.whenStable();
        codeInput.blur();

        failVerifiedList(ProblemCode.CodeInvalid);
        await fixture.whenStable();

        expect(document.activeElement).toBe(codeInput);
      },
    );

    it(
      'confirms a sent code with a notice on the code step',
      (): void => {
        openCodeStep();

        expect(byTestId('lookup-notice')).not.toBeNull();
      },
    );

    it(
      'asks for a new code with an empty code field',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        buttonByTestId('resend-code')?.click();
        fixture.detectChanges();

        expect(codeRequests).toEqual([{ phone: '+15555550123' }, { phone: '+15555550123' }]);
        expect(codeInput.value).toBe('');
      },
    );

    it(
      'goes back to the phone step to use another number, without a notice',
      (): void => {
        openCodeStep();
        buttonByTestId('change-phone')?.click();

        expect(byTestId('send-code')).not.toBeNull();
        expect(byTestId('lookup-code')).toBeNull();
        expect(byTestId('lookup-notice')).toBeNull();
      },
    );

    it(
      'lists the found bookings in order, each a link to its manage page with its token in the fragment, encoded once',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();
        answerVerifiedList(foundBookings);

        const links: HTMLAnchorElement[] = Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[data-testid="found-booking"]'),
        );

        expect(links.map((link: HTMLAnchorElement): string | null => link.getAttribute('href'))).toEqual([
          '/book/manage/made-up%2Ffirst#t=made%252Bup%252Ffirst%253Dtoken',
          '/book/manage/made-up-second#t=made-up-second-token',
        ]);
      },
    );

    it(
      'says there is nothing upcoming, and lists nothing, when the phone has no bookings',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();
        answerVerifiedList([]);

        expect(byTestId('no-bookings')).not.toBeNull();
        expect(byTestId('found-bookings')).toBeNull();
        expect(byTestId('lookup-notice')).toBeNull();
      },
    );

    it(
      'drops a request still sent when the page is left',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        submit();
        expect(verifiedListResponses[0]?.observed).toBe(true);

        fixture.destroy();

        expect(verifiedListResponses[0]?.observed).toBe(false);
      },
    );
  },
);
