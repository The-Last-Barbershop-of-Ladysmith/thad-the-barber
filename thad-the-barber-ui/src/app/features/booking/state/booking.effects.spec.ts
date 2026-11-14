import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action, Store, provideStore } from '@ngrx/store';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { testBookingWindow, testFirstMonth, testMonthView } from '../../../../testing/test-availability';
import { TEST_SHOP } from '../../../../testing/test-shop';
import { SessionService } from '../../../core/services/session.service';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { addDays, toIsoDate } from '../../../shared/utils/date.utils';
import { AppState } from '../../../store/app.state';
import * as ShopActions from '../../shop/state/shop.actions';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { DayRange } from '../models/day-range.model';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import { toMonthRange } from '../utils/booking-time.utils';
import {
  BOOKING_CHANGED_NOTICE,
  CODE_INVALID_NOTICE,
  LOOKUP_FAILED_NOTICE,
  LOOKUP_RATE_LIMITED_NOTICE,
  SLOT_TAKEN_NOTICE,
} from '../config/booking-notices';
import * as BookingActions from './booking.actions';
import {
  loadAvailability,
  openBookedPage,
  openFirstMonth,
  requestBooking,
  requestLookupStart,
  requestLookupVerify,
  requestReschedule,
  returnToMovedBooking,
} from './booking.effects';
import { bookingFeature } from './booking.feature';

const availableDays: AvailableDay[] = [{ date: '2026-02-03', times: ['2026-02-03T20:00:00Z'] }];
const february: DayRange = testMonthView('2026-02');

describe(
  'loadAvailability',
  (): void => {
    let requestedRanges: DayRange[];
    let actions$: Subject<Action>;
    let store: Store<AppState>;

    function dispatch(action: Action): void {
      store.dispatch(action);
      actions$.next(action);
    }

    function viewWith(getAvailableDays: () => Observable<AvailableDay[]>): Action[] {
      requestedRanges = [];
      actions$ = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [bookingFeature.name]: bookingFeature.reducer }),
          { provide: Actions, useValue: new Actions(actions$) },
          {
            provide: AvailabilityService,
            useValue: {
              getAvailableDays: (dayRange: DayRange): Observable<AvailableDay[]> => {
                requestedRanges.push(dayRange);
                return getAvailableDays();
              },
            },
          },
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadAvailability() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      return emitted;
    }

    it(
      'reloads the days when the same view is set again',
      (): void => {
        viewWith((): Observable<AvailableDay[]> => of(availableDays));
        dispatch(BookingActions.AvailabilityRequest({ dayRange: february }));
        dispatch(BookingActions.AvailabilityRequest({ dayRange: february }));

        expect(requestedRanges).toEqual([february, february]);
      },
    );

    it(
      "asks for the view's own days and stores what comes back",
      (): void => {
        const emitted: Action[] = viewWith((): Observable<AvailableDay[]> => of(availableDays));
        dispatch(BookingActions.AvailabilityRequest({ dayRange: february }));

        expect(emitted).toEqual([BookingActions.AvailabilityRequestSuccess({ availableDays })]);
        expect(requestedRanges).toEqual([february]);
        expect(february).toEqual(expect.objectContaining({ firstDay: '2026-02-01', lastDay: '2026-02-28' }));
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<AvailableDay[]> = (): Observable<AvailableDay[]> =>
          throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 503 }));
        const emitted: Action[] = viewWith(failing);
        dispatch(BookingActions.AvailabilityRequest({ dayRange: february }));

        expect(emitted).toEqual([BookingActions.AvailabilityRequestFailure()]);
      },
    );
  },
);

describe(
  'openFirstMonth',
  (): void => {
    let actions$: Subject<Action>;
    let store: Store<AppState>;
    let emitted: Action[];

    beforeEach((): void => {
      actions$ = new Subject<Action>();
      emitted = [];
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          { provide: Actions, useValue: new Actions(actions$) },
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      TestBed.runInInjectionContext((): Observable<Action> => openFirstMonth() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
    });

    it(
      "opens today's 31-day block when the page opens, once the shop is known, on its clock",
      (): void => {
        actions$.next(BookingActions.BookingPageOpen({ pickedStartAt: null }));
        expect(emitted).toEqual([]);

        store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(emitted).toEqual([BookingActions.AvailabilityRequest({ dayRange: testFirstMonth() })]);
      },
    );

    it(
      'opens the month of a time picked on the home page',
      (): void => {
        store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        const pickedDay: Date = addDays(testBookingWindow().min, 20);
        const pickedMonth: DayRange = toMonthRange(pickedDay.getFullYear(), pickedDay.getMonth() + 1);

        actions$.next(BookingActions.BookingPageOpen({ pickedStartAt: `${toIsoDate(pickedDay)}T20:00:00Z` }));

        expect(emitted).toEqual([BookingActions.AvailabilityRequest({ dayRange: pickedMonth })]);
      },
    );
  },
);

describe(
  'sending a booking or move',
  (): void => {
    const bookingRequest: BookingRequest = {
      startAt: '2026-02-03T20:00:00Z',
      name: 'Test Customer',
      phone: '+15550100199',
      idempotencyKey: 'made-up-key',
    };
    const confirmation: BookingConfirmation = {
      id: 'made-up-booking',
      startAt: bookingRequest.startAt,
      manageToken: 'made-up-token',
    };
    const moved: ManagedBooking = {
      id: confirmation.id,
      startAt: '2026-02-03T20:30:00Z',
      isCancelled: false,
      canChange: true,
    };
    let actions$: Subject<Action>;
    let emitted: Action[];
    let response: Subject<unknown>;
    let isBotCheckFailed: WritableSignal<boolean>;
    let navigateByUrl: Mock;
    let toasts: ToastMessageOptions[];

    function failWith(status: number, code: ProblemCode): void {
      response.error(new HttpErrorResponse({ status, error: { code } }));
    }

    beforeEach((): void => {
      actions$ = new Subject<Action>();
      emitted = [];
      response = new Subject<unknown>();
      isBotCheckFailed = signal(false);
      toasts = [];
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: Actions, useValue: new Actions(actions$) },
          {
            provide: BookingService,
            useValue: {
              createBooking: (): Observable<unknown> => response,
              rescheduleBooking: (): Observable<unknown> => response,
            },
          },
          { provide: SessionService, useValue: { isBotCheckFailed } },
          {
            provide: MessageService,
            useValue: {
              add: (toast: ToastMessageOptions): void => {
                toasts.push(toast);
              },
            },
          },
        ],
      });
      navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      for (const effect of [
        requestBooking,
        openBookedPage,
        requestReschedule,
      ]) {
        TestBed.runInInjectionContext((): Observable<Action> => effect() as Observable<Action>)
          .subscribe((action: Action): void => {
            emitted.push(action);
          });
      }
      TestBed.runInInjectionContext((): Observable<unknown> => returnToMovedBooking()).subscribe();
    });

    it(
      'passes on the made booking and opens its page as just booked, handing over its token',
      (): void => {
        actions$.next(BookingActions.BookingRequest({ bookingRequest }));
        response.next(confirmation);

        expect(emitted).toEqual([BookingActions.BookingRequestSuccess({ bookingConfirmation: confirmation })]);
        actions$.next(BookingActions.BookingRequestSuccess({ bookingConfirmation: confirmation }));
        expect(navigateByUrl).toHaveBeenCalledWith(
          '/book/manage/made-up-booking',
          { state: { isJustBooked: true, manageToken: confirmation.manageToken } },
        );
      },
    );

    it(
      'says why a taken time failed and passes it on to come off the open times',
      (): void => {
        actions$.next(BookingActions.BookingRequest({ bookingRequest }));
        failWith(409, ProblemCode.SlotUnavailable);

        expect(emitted).toEqual([
          BookingActions.BookingRequestFailure({
            notice: SLOT_TAKEN_NOTICE,
            takenStartAt: bookingRequest.startAt,
          }),
        ]);
      },
    );

    it(
      'leaves a failed bot check to its own message',
      (): void => {
        actions$.next(BookingActions.BookingRequest({ bookingRequest }));
        isBotCheckFailed.set(true);
        failWith(403, ProblemCode.BotCheckFailed);

        expect(emitted).toEqual([BookingActions.BookingRequestFailure({ notice: null, takenStartAt: null })]);
      },
    );

    it(
      'moves a booking with its token, says so and goes back to its page in place of the reschedule page',
      (): void => {
        actions$.next(BookingActions.RescheduleRequest({
          bookingId: moved.id,
          manageToken: 'made-up-token',
          startAt: moved.startAt,
        }));
        response.next(moved);
        actions$.next(BookingActions.RescheduleRequestSuccess({ managedBooking: moved, manageToken: 'made-up-token' }));

        expect(emitted).toEqual([BookingActions.RescheduleRequestSuccess({ managedBooking: moved, manageToken: 'made-up-token' })]);
        expect(toasts).toEqual([{ severity: 'success', summary: 'Appointment moved' }]);
        expect(navigateByUrl).toHaveBeenCalledWith(
          '/book/manage/made-up-booking',
          {
            replaceUrl: true,
            state: { manageToken: 'made-up-token' },
          },
        );
      },
    );

    it(
      'says a booking that started or was cancelled meanwhile can no longer move, staying on the page',
      (): void => {
        actions$.next(BookingActions.RescheduleRequest({
          bookingId: moved.id,
          manageToken: 'made-up-token',
          startAt: moved.startAt,
        }));
        failWith(409, ProblemCode.BookingStarted);

        expect(emitted).toEqual([
          BookingActions.RescheduleRequestFailure({
            notice: BOOKING_CHANGED_NOTICE,
            takenStartAt: null,
          }),
        ]);
        expect((emitted[0] as ReturnType<typeof BookingActions.RescheduleRequestFailure>).notice?.canRetry).toBe(false);
        expect(navigateByUrl).not.toHaveBeenCalled();
      },
    );

    it(
      'passes on a taken time for a move as when booking, with a notice that offers no retry',
      (): void => {
        actions$.next(BookingActions.RescheduleRequest({
          bookingId: moved.id,
          manageToken: 'made-up-token',
          startAt: moved.startAt,
        }));
        failWith(409, ProblemCode.SlotUnavailable);

        const failure: ReturnType<typeof BookingActions.RescheduleRequestFailure> =
          emitted[0] as ReturnType<typeof BookingActions.RescheduleRequestFailure>;
        expect(failure.takenStartAt).toBe(moved.startAt);
        expect(failure.notice?.canRetry).toBe(false);
      },
    );
  },
);

describe(
  'looking up bookings',
  (): void => {
    const phone: string = '+15555550123';
    const foundBookings: FoundBooking[] = [
      {
        id: 'made-up-booking',
        startAt: '2026-02-03T20:00:00Z',
        manageToken: 'made-up-token',
      },
    ];
    let actions$: Subject<Action>;
    let emitted: Action[];
    let response: Subject<unknown>;
    let sentCount: number;

    function failWith(status: number, code: ProblemCode): void {
      response.error(new HttpErrorResponse({ status, error: { code } }));
    }

    beforeEach((): void => {
      actions$ = new Subject<Action>();
      emitted = [];
      response = new Subject<unknown>();
      sentCount = 0;
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          {
            provide: BookingService,
            useValue: {
              startLookup: (): Observable<unknown> => {
                sentCount++;
                return response;
              },
              verifyLookup: (): Observable<unknown> => {
                sentCount++;
                return response;
              },
            },
          },
        ],
      });
      for (const effect of [requestLookupStart, requestLookupVerify]) {
        TestBed.runInInjectionContext((): Observable<Action> => effect() as Observable<Action>)
          .subscribe((action: Action): void => {
            emitted.push(action);
          });
      }
    });

    it(
      'reports the code as sent',
      (): void => {
        actions$.next(BookingActions.LookupStartRequest({ phone }));
        response.next(null);

        expect(emitted).toEqual([BookingActions.LookupStartRequestSuccess()]);
      },
    );

    it(
      'passes on the found bookings, even none',
      (): void => {
        actions$.next(BookingActions.LookupVerifyRequest({ phone, code: '0042' }));
        response.next([]);

        expect(emitted).toEqual([BookingActions.LookupVerifyRequestSuccess({ foundBookings: [] })]);
      },
    );

    it(
      'passes on the found bookings in the order they came',
      (): void => {
        actions$.next(BookingActions.LookupVerifyRequest({ phone, code: '0042' }));
        response.next(foundBookings);

        expect(emitted).toEqual([BookingActions.LookupVerifyRequestSuccess({ foundBookings })]);
      },
    );

    it(
      'lets the customer retry a wrong code and tells a rate limit apart',
      (): void => {
        actions$.next(BookingActions.LookupVerifyRequest({ phone, code: '0042' }));
        failWith(400, ProblemCode.CodeInvalid);
        response = new Subject<unknown>();
        actions$.next(BookingActions.LookupStartRequest({ phone }));
        failWith(429, ProblemCode.RateLimited);

        expect(emitted).toEqual([
          BookingActions.LookupVerifyRequestFailure({ notice: CODE_INVALID_NOTICE }),
          BookingActions.LookupStartRequestFailure({ notice: LOOKUP_RATE_LIMITED_NOTICE }),
        ]);
      },
    );

    it(
      'shows the failed notice for any other failure',
      (): void => {
        actions$.next(BookingActions.LookupStartRequest({ phone }));
        response.error(new HttpErrorResponse({ status: 503 }));

        expect(emitted).toEqual([BookingActions.LookupStartRequestFailure({ notice: LOOKUP_FAILED_NOTICE })]);
      },
    );

    it(
      'sends a second request only once the first is answered',
      (): void => {
        actions$.next(BookingActions.LookupStartRequest({ phone }));
        actions$.next(BookingActions.LookupStartRequest({ phone }));

        expect(sentCount).toBe(1);
      },
    );

    it(
      'drops an answer that comes after the page was left',
      (): void => {
        actions$.next(BookingActions.LookupVerifyRequest({ phone, code: '0042' }));
        actions$.next(BookingActions.LookupReset());
        response.next(foundBookings);

        expect(emitted).toEqual([]);
      },
    );
  },
);
