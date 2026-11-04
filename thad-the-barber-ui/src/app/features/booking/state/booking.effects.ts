import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { Observable, catchError, combineLatest, exhaustMap, filter, map, of, switchMap, take, tap } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { Notice } from '../../../shared/models/notice.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode, toProblemNotice } from '../../../shared/utils/problem.utils';
import { AppState } from '../../../store/app.state';
import { BookingSettings } from '../../shop/models/booking-settings.model';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { DayRange } from '../models/day-range.model';
import { DateRange } from '../models/date-range.model';
import { ManagePageState } from '../models/manage-page-state.model';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import {
  BOOKING_FAILED_NOTICE,
  BOOKING_PROBLEM_NOTICES,
  CHANGE_PROBLEM_NOTICES,
  RESCHEDULE_FAILED_NOTICE,
} from '../config/booking-notices';
import { toBookingWindow, toMonthRange } from '../utils/booking-time.utils';
import { toManagePath } from '../utils/manage-link.utils';
import * as BookingActions from './booking.actions';

interface SubmitFailure {
  notice: Notice | null;
  takenStartAt: string | null;
}

// Waits for the shop, so "today" and the booking window are on its clock, not the browser's.
export const openFirstMonth: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    store: Store<AppState> = inject<Store<AppState>>(Store),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.BookingPageOpen),
      switchMap((): Observable<DateRange> => combineLatest([
        store.select(shopFeature.selectBookingSettings),
        store.select(shopFeature.selectTimeZone),
      ]).pipe(
        map(([bookingSettings, timeZone]: [BookingSettings | null, string | null]): DateRange | null =>
          toBookingWindow(bookingSettings, timeZone)),
        filter((bookingWindow: DateRange | null): bookingWindow is DateRange => bookingWindow !== null),
        take(1),
      )),
      map((bookingWindow: DateRange): Action => BookingActions.AvailabilityRequest({
        dayRange: toMonthRange(bookingWindow.min.getFullYear(), bookingWindow.min.getMonth() + 1),
      })),
    ),
  { functional: true },
);

export const loadAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availabilityService: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.AvailabilityRequest),
      switchMap(({ dayRange }: { dayRange: DayRange; }): Observable<Action> =>
        availabilityService.getAvailableDays(dayRange).pipe(
          map((availableDays: AvailableDay[]): Action => BookingActions.AvailabilityRequestSuccess({ availableDays })),
          catchError((): Observable<Action> => of(BookingActions.AvailabilityRequestFailure())),
        )),
    ),
  { functional: true },
);

export const requestBooking: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    bookingService: BookingService = inject(BookingService),
    sessionService: SessionService = inject(SessionService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.BookingRequest),
      exhaustMap(({ bookingRequest }: { bookingRequest: BookingRequest; }): Observable<Action> =>
        bookingService.createBooking(bookingRequest).pipe(
          map((bookingConfirmation: BookingConfirmation): Action =>
            BookingActions.BookingRequestSuccess({ bookingConfirmation })),
          catchError((error: unknown): Observable<Action> => of(BookingActions.BookingRequestFailure(toFailure(
            error,
            BOOKING_PROBLEM_NOTICES,
            BOOKING_FAILED_NOTICE,
            bookingRequest.startAt,
            sessionService,
          )))),
        )),
    ),
  { functional: true },
);

export const openBookedPage: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(BookingActions.BookingRequestSuccess),
      tap(({ bookingConfirmation }: { bookingConfirmation: BookingConfirmation; }): void => {
        const managePageState: ManagePageState = {
          isJustBooked: true,
          manageToken: bookingConfirmation.manageToken,
        };
        void router.navigateByUrl(toManagePath(bookingConfirmation.id), { state: managePageState });
      }),
    ),
  {
    functional: true,
    dispatch: false,
  },
);

export const requestReschedule: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    bookingService: BookingService = inject(BookingService),
    sessionService: SessionService = inject(SessionService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.RescheduleRequest),
      exhaustMap(({
        bookingId,
        manageToken,
        startAt,
      }: {
        bookingId: string;
        manageToken: string;
        startAt: string;
      }): Observable<Action> =>
        bookingService.rescheduleBooking(
          bookingId,
          manageToken,
          { startAt },
        ).pipe(
          map((managedBooking: ManagedBooking): Action =>
            BookingActions.RescheduleRequestSuccess({ managedBooking, manageToken })),
          catchError((error: unknown): Observable<Action> => of(BookingActions.RescheduleRequestFailure(toFailure(
            error,
            CHANGE_PROBLEM_NOTICES,
            RESCHEDULE_FAILED_NOTICE,
            startAt,
            sessionService,
          )))),
        )),
    ),
  { functional: true },
);

// Replaces the reschedule page in history, so Back doesn't return to a finished move.
export const returnToMovedBooking: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
    messageService: MessageService = inject(MessageService),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(BookingActions.RescheduleRequestSuccess),
      tap(({ managedBooking, manageToken }: { managedBooking: ManagedBooking; manageToken: string; }): void => {
        messageService.add({ severity: 'success', summary: 'Appointment moved' });
        const managePageState: ManagePageState = { manageToken };
        void router.navigateByUrl(
          toManagePath(managedBooking.id),
          {
            replaceUrl: true,
            state: managePageState,
          },
        );
      }),
    ),
  {
    functional: true,
    dispatch: false,
  },
);

// A failed bot check already shows its own message, so its failure carries no notice. A taken time comes off the open
// times.
function toFailure(
  error: unknown,
  problemNotices: Record<string, Notice>,
  failedNotice: Notice,
  startAt: string,
  sessionService: SessionService,
): SubmitFailure {
  if (sessionService.isBotCheckFailed()) {
    return { notice: null, takenStartAt: null };
  }
  const isTimeTaken: boolean = getProblemCode(error) === ProblemCode.SlotUnavailable;
  return {
    notice: toProblemNotice(
      error,
      problemNotices,
      failedNotice,
    ),
    takenStartAt: isTimeTaken ? startAt : null,
  };
}
