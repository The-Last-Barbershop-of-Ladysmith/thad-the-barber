import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { CODE_INVALID_NOTICE } from '../../config/booking-notices';
import { FoundBooking } from '../../dtos/found-booking.dto';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
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

interface FindBookingsPage {
  lookupForm: FormGroup<{ phone: FormControl<string>; code: FormControl<string>; }>;
}

describe(
  'FindBookings',
  (): void => {
    let fixture: ComponentFixture<FindBookings>;
    let store: Store<AppState>;
    let dispatched: Action[];

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          provideRouter([]),
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      fixture = TestBed.createComponent(FindBookings);
      fixture.detectChanges();
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
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
      const page: FindBookingsPage = fixture.componentInstance as unknown as FindBookingsPage;
      page.lookupForm.controls.phone.setValue(MADE_UP_PHONE_FIELD_VALUE);
      fixture.detectChanges();
    }

    function submit(): void {
      byTestId('lookup-form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    }

    function openCodeStep(): HTMLInputElement {
      typePhone();
      store.dispatch(BookingActions.LookupStartRequestSuccess());
      const codeInput: HTMLInputElement | null = inputByTestId('lookup-code');
      if (!codeInput) {
        throw new Error('No code input');
      }
      return codeInput;
    }

    function dispatchedOf(actionCreator: { type: string; }): Action[] {
      return dispatched.filter((action: Action): boolean => action.type === actionCreator.type);
    }

    it(
      'starts empty on the phone step, with nothing to send',
      (): void => {
        expect(buttonByTestId('send-code')?.disabled).toBe(true);
        expect(byTestId('lookup-code')).toBeNull();
        expect(dispatchedOf(BookingActions.LookupStartRequest)).toEqual([]);
      },
    );

    it(
      'sends the code to the phone in E.164 once it is complete',
      (): void => {
        typePhone();

        expect(buttonByTestId('send-code')?.disabled).toBe(false);
        submit();

        expect(dispatchedOf(BookingActions.LookupStartRequest))
          .toEqual([BookingActions.LookupStartRequest({ phone: '+15555550123' })]);
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
        expect(dispatchedOf(BookingActions.LookupVerifyRequest))
          .toEqual([BookingActions.LookupVerifyRequest({ phone: '+15555550123', code: '0042' })]);
      },
    );

    it(
      'locks the inputs and both actions while a request is sent',
      (): void => {
        const codeInput: HTMLInputElement = openCodeStep();
        type(codeInput, '0042');
        store.dispatch(BookingActions.LookupVerifyRequest({ phone: '+15555550123', code: '0042' }));
        fixture.detectChanges();

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
        store.dispatch(BookingActions.LookupVerifyRequest({ phone: '+15555550123', code: '0042' }));
        store.dispatch(BookingActions.LookupVerifyRequestFailure({ notice: CODE_INVALID_NOTICE }));
        fixture.detectChanges();

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
        store.dispatch(BookingActions.LookupVerifyRequest({ phone: '+15555550123', code: '0042' }));
        fixture.detectChanges();
        await fixture.whenStable();
        codeInput.blur();

        store.dispatch(BookingActions.LookupVerifyRequestFailure({ notice: CODE_INVALID_NOTICE }));
        fixture.detectChanges();
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

        expect(dispatchedOf(BookingActions.LookupStartRequest))
          .toEqual([BookingActions.LookupStartRequest({ phone: '+15555550123' })]);
        expect(codeInput.value).toBe('');
      },
    );

    it(
      'goes back to the phone step to use another number',
      (): void => {
        openCodeStep();
        buttonByTestId('change-phone')?.click();

        expect(byTestId('send-code')).not.toBeNull();
        expect(byTestId('lookup-code')).toBeNull();
      },
    );

    it(
      'lists the found bookings in order, each a link to its manage page with its token in the fragment, encoded once for the router',
      (): void => {
        openCodeStep();
        store.dispatch(BookingActions.LookupVerifyRequestSuccess({ foundBookings }));
        fixture.detectChanges();

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
        openCodeStep();
        store.dispatch(BookingActions.LookupVerifyRequestSuccess({ foundBookings: [] }));

        expect(byTestId('no-bookings')).not.toBeNull();
        expect(byTestId('found-bookings')).toBeNull();
        expect(byTestId('lookup-notice')).toBeNull();
      },
    );

    it(
      'forgets the found bookings when the page is left',
      async (): Promise<void> => {
        openCodeStep();
        store.dispatch(BookingActions.LookupVerifyRequestSuccess({ foundBookings }));
        dispatched = [];

        fixture.destroy();

        expect(dispatched).toEqual([BookingActions.LookupReset()]);
        expect(await firstValueFrom(store.select(bookingFeature.selectFoundBookings))).toEqual([]);
      },
    );
  },
);
