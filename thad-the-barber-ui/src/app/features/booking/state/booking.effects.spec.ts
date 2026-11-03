import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action, Store, provideStore } from '@ngrx/store';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { testFirstMonth, testMonthView } from '../../../../testing/test-availability';
import { TEST_SHOP } from '../../../../testing/test-shop';
import { SessionService } from '../../../core/services/session.service';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { AppState } from '../../../store/app.state';
import * as ShopActions from '../../shop/state/shop.actions';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { DayRange } from '../models/day-range.model';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import { RESCHEDULE_FAILED_NOTICE, toBookingNotice, toManageActionNotice } from '../utils/booking-notice.utils';
import * as BookingActions from './booking.actions';
import {
  loadAvailability,
  openBookedPage,
  openFirstMonth,
  requestBooking,
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
        actions$.next(BookingActions.BookingPageOpen());
        expect(emitted).toEqual([]);

        store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(emitted).toEqual([BookingActions.AvailabilityRequest({ dayRange: testFirstMonth() })]);
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
            notice: toBookingNotice(
              new HttpErrorResponse({ status: 409, error: { code: ProblemCode.SlotUnavailable } }),
            ),
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
            notice: toManageActionNotice(
              new HttpErrorResponse({ status: 409, error: { code: ProblemCode.BookingStarted } }),
              RESCHEDULE_FAILED_NOTICE,
            ),
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
