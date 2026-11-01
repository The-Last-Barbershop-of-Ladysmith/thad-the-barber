import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { Observable, catchError, combineLatest, exhaustMap, filter, from, map, of, switchMap, take, tap } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { Notice } from '../../../shared/models/notice.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { AppState } from '../../../store/app.state';
import { BookingSettings } from '../../shop/models/booking-settings.model';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { DateRange } from '../models/date-range.model';
import { ManagePageState } from '../models/manage-page-state.model';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import {
  RESCHEDULE_FAILED_NOTICE,
  hasBookingChanged,
  toBookingNotice,
  toManageActionNotice,
} from '../utils/booking-notice.utils';
import { toBookingWindow, toUpcomingView } from '../utils/booking-time.utils';
import { toManagePath } from '../utils/manage-link.utils';
import * as BookingActions from './booking.actions';
import { bookingFeature } from './booking.feature';

/** What a failed send passes on: the notice to show, or none for a failed bot check. */
type FailureActionCreator = (failure: { notice: Notice | null; }) => Action;

/**
 * Opens the next 31 days for /book and a booking's reschedule page. It waits for the shop, so "today" and the
 * booking window are the shop's, not the browser's.
 */
export const openUpcomingDays: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    store: Store<AppState> = inject<Store<AppState>>(Store),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.UpcomingDaysOpen),
      switchMap((): Observable<DateRange> =>
        combineLatest([
          store.select(shopFeature.selectBookingSettings),
          store.select(shopFeature.selectTimeZone),
        ]).pipe(
          map(([bookingSettings, timeZone]: [BookingSettings | null, string | null]): DateRange | null =>
            toBookingWindow(bookingSettings, timeZone)),
          filter((bookingWindow: DateRange | null): bookingWindow is DateRange => bookingWindow !== null),
          take(1),
        )),
      map((bookingWindow: DateRange): Action => BookingActions.SetAvailabilityView({
        availabilityView: toUpcomingView(bookingWindow.min, bookingWindow),
      })),
    ),
  { functional: true },
);

/** Asks again for the days in view, after a taken time or a failed load. */
export const reloadAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    store: Store<AppState> = inject<Store<AppState>>(Store),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.AvailabilityReload),
      switchMap((): Observable<AvailabilityView | null> =>
        store.select(bookingFeature.selectAvailabilityView).pipe(take(1))),
      filter((availabilityView: AvailabilityView | null): availabilityView is AvailabilityView =>
        availabilityView !== null),
      map((availabilityView: AvailabilityView): Action => BookingActions.SetAvailabilityView({ availabilityView })),
    ),
  { functional: true },
);

/** Asks for the view's days, which it already holds as shop-calendar days. */
export const loadAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availabilityService: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.SetAvailabilityView),
      switchMap(({ availabilityView }: { availabilityView: AvailabilityView; }): Observable<Action> =>
        availabilityService.getAvailableDays(availabilityView).pipe(
          map((availableDays: AvailableDay[]): Action =>
            BookingActions.AvailabilityRequestSuccess({ availabilityView, availableDays })),
          catchError((): Observable<Action> =>
            of(BookingActions.AvailabilityRequestFailure({ availabilityView }))),
        )),
    ),
  { functional: true },
);

/** Sends the booking; one at a time, since the page locks its form while one is sent. */
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
          catchError((error: unknown): Observable<Action> => from(toFailureActions(
            error,
            toBookingNotice(error),
            sessionService,
            BookingActions.BookingRequestFailure,
          ))),
        )),
    ),
  { functional: true },
);

/**
 * Opens the booking's own page, which confirms it from this device's list (BR-22); the token stays on the device, not
 * in the URL. If that page doesn't open, the booking page confirms it instead.
 */
export const openBookedPage: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.BookingRequestSuccess),
      exhaustMap(({ bookingConfirmation }: { bookingConfirmation: BookingConfirmation; }): Observable<Action> => {
        const managePageState: ManagePageState = { isJustBooked: true };
        return from(router.navigateByUrl(toManagePath(bookingConfirmation.id), { state: managePageState })).pipe(
          catchError((): Observable<boolean> => of(false)),
          filter((isNavigated: boolean): boolean => !isNavigated),
          map((): Action => BookingActions.BookingShownHere({ bookingId: bookingConfirmation.id })),
        );
      }),
    ),
  { functional: true },
);

/** Moves the booking with its token; a booking that changed meanwhile goes back to its page, which shows why. */
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
          catchError((error: unknown): Observable<Action> => {
            if (hasBookingChanged(error)) {
              return of(BookingActions.RescheduleReturn({ bookingId, manageToken }));
            }
            return from(toFailureActions(
              error,
              toManageActionNotice(error, RESCHEDULE_FAILED_NOTICE),
              sessionService,
              BookingActions.RescheduleRequestFailure,
            ));
          }),
        )),
    ),
  { functional: true },
);

/** Says the booking moved and goes back to its page. */
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
        openBookingPage(
          router,
          managedBooking.id,
          manageToken,
        );
      }),
    ),
  {
    functional: true,
    dispatch: false,
  },
);

/** Goes back to a booking that changed meanwhile; its page shows why. */
export const returnToChangedBooking: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(BookingActions.RescheduleReturn),
      tap(({ bookingId, manageToken }: { bookingId: string; manageToken: string; }): void => {
        openBookingPage(
          router,
          bookingId,
          manageToken,
        );
      }),
    ),
  {
    functional: true,
    dispatch: false,
  },
);

/** Replaces the reschedule page, so Back doesn't return to a finished move. */
function openBookingPage(
  router: Router,
  bookingId: string,
  manageToken: string,
): void {
  const managePageState: ManagePageState = { manageToken };
  void router.navigateByUrl(
    toManagePath(bookingId),
    {
      replaceUrl: true,
      state: managePageState,
    },
  );
}

/**
 * A taken time is gone for good: the page drops it and opens the time step, the days reload to show what's still open,
 * then the failure's notice shows, last, so the page dropping the time doesn't clear it. A failed bot check already
 * has its own message, so its failure has none.
 */
function toFailureActions(
  error: unknown,
  notice: Notice,
  sessionService: SessionService,
  toFailure: FailureActionCreator,
): Action[] {
  if (sessionService.isBotCheckFailed()) {
    return [toFailure({ notice: null })];
  }
  if (getProblemCode(error) === ProblemCode.SlotUnavailable) {
    return [
      BookingActions.BookingTimeTaken(),
      BookingActions.AvailabilityReload(),
      toFailure({ notice }),
    ];
  }
  return [toFailure({ notice })];
}
