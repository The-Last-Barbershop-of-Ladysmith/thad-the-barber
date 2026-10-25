import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { testSavedConfirmation } from '../../../testing/test-booking';
import { TEST_SHOP } from '../../../testing/test-shop';
import { SessionService } from '../../core/services/session.service';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { fromIsoDate, toIsoDateIn } from '../../shared/utils/date.utils';
import { AppState } from '../../store/app.state';
import * as ShopActions from '../shop/state/shop.actions';
import { shopFeature } from '../shop/state/shop.feature';
import { Booking } from './booking';
import { BookingConfirmation } from './models/booking-confirmation.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingRequest } from './models/booking-request.model';
import { SavedConfirmation } from './models/saved-confirmation.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';

/** The page's protected members the spec drives, read by name so the class stays unchanged. */
interface BookingPage {
  onDateSelect: (date: Date) => void;
  onTimeSelect: (startAt: string) => void;
  confirm: () => void;
  selectedStartAt: () => string | null;
  bookingNotice: () => BookingNotice | null;
  confirmationText: () => string | null;
  isBooked: () => boolean;
  form: Booking['form'];
}

const TODAY: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
const FIRST_TIME: string = `${TODAY}T20:00:00Z`;
const SECOND_TIME: string = `${TODAY}T20:30:00Z`;

describe(
  'Booking',
  (): void => {
    let page: BookingPage;
    let requests: BookingRequest[];
    let responses: Subject<BookingConfirmation>[];
    let isBotCheckFailed: WritableSignal<boolean>;
    let dispatched: Action[];

    function createBooking(request: BookingRequest): Observable<BookingConfirmation> {
      const response: Subject<BookingConfirmation> = new Subject<BookingConfirmation>();
      requests.push(request);
      responses.push(response);
      return response;
    }

    function confirmation(request: BookingRequest | undefined): BookingConfirmation {
      return {
        id: 'made-up-booking',
        startAt: request?.startAt ?? '',
        manageToken: 'made-up-token',
      };
    }

    function fail(
      index: number,
      status: number,
      code: string,
    ): void {
      responses[index]?.error(new HttpErrorResponse({ status, error: { code } }));
    }

    function pickAndConfirm(startAt: string): void {
      page.form.setValue({ name: 'Test Customer', phone: '(555) 010-0199' });
      page.onDateSelect(fromIsoDate(TODAY));
      page.onTimeSelect(startAt);
      page.confirm();
    }

    beforeEach((): void => {
      requests = [];
      responses = [];
      isBotCheckFailed = signal(false);
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer, [bookingFeature.name]: bookingFeature.reducer }),
          { provide: BookingService, useValue: { createBooking } },
          { provide: SessionService, useValue: { isBotCheckFailed } },
        ],
      });
      TestBed.overrideComponent(Booking, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    });

    /** Opens the page as after a reload, with `savedConfirmation` as the booking kept from the last 24 hours. */
    function openPage(savedConfirmation: SavedConfirmation | null = null): void {
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      if (savedConfirmation) {
        store.dispatch(BookingActions.BookingConfirm({ savedConfirmation }));
      }
      const fixture: ComponentFixture<Booking> = TestBed.createComponent(Booking);
      fixture.detectChanges();
      store.dispatch(BookingActions.MonthAvailabilityRequestSuccess({
        month: TODAY.slice(0, 7),
        availableDays: [{ date: TODAY, times: [FIRST_TIME, SECOND_TIME] }],
      }));
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
      page = fixture.componentInstance as unknown as BookingPage;
    }

    it(
      'retries a failed booking with the same key, and a changed time gets a new one',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        fail(
          0,
          503,
          'square_unavailable',
        );
        page.confirm();
        page.onTimeSelect(SECOND_TIME);
        page.confirm();

        expect(requests[1]?.idempotencyKey).toBe(requests[0]?.idempotencyKey);
        expect(requests[2]?.idempotencyKey).not.toBe(requests[0]?.idempotencyKey);
        expect(requests[0]?.phone).toBe('+15550100199');
      },
    );

    it(
      'sends only one booking: confirming again after it went through does nothing',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));
        responses[0]?.complete();
        page.confirm();

        expect(requests).toHaveLength(1);
      },
    );

    it(
      'drops a taken time and reloads the month in view',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        fail(
          0,
          409,
          ProblemCode.SlotUnavailable,
        );

        expect(page.selectedStartAt()).toBeNull();
        expect(page.bookingNotice()).not.toBeNull();
        expect(dispatched).toContainEqual(BookingActions.SetActiveMonthView({ month: TODAY.slice(0, 7) }));
      },
    );

    it(
      'leaves a failed bot check to its own message and sends nothing more',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        isBotCheckFailed.set(true);
        fail(
          0,
          403,
          ProblemCode.BotCheckFailed,
        );
        page.confirm();

        expect(page.bookingNotice()).toBeNull();
        expect(requests).toHaveLength(1);
      },
    );

    it(
      'confirms the phone the booking was sent with, even if it was edited while in flight',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        page.form.controls.phone.setValue('(555) 010-0188');
        responses[0]?.next(confirmation(requests[0]));

        expect(page.confirmationText()).toContain('(555) 010-0199');
      },
    );

    it(
      'keeps the booking it confirmed for 24 hours, so a reload still shows it',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));

        expect(dispatched).toContainEqual(BookingActions.BookingConfirm({
          savedConfirmation: { booking: confirmation(requests[0]), savedAt: expect.any(String) as string },
        }));
      },
    );

    it(
      'shows a booking kept from the last 24 hours as booked, without the phone, which is never saved',
      (): void => {
        const tomorrow: string = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        openPage(testSavedConfirmation(new Date().toISOString(), tomorrow));

        expect(page.isBooked()).toBe(true);
        expect(page.confirmationText()).not.toContain('text confirmation');
      },
    );
  },
);
