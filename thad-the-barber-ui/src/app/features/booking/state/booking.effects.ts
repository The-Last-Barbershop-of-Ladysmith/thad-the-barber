import { inject } from '@angular/core';
import {
  Actions,
  FunctionalEffect,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  Observable,
  catchError,
  exhaustMap,
  map,
  of,
  switchMap,
} from 'rxjs';
import { BookingConfirmation, TimeSlot } from '../models/booking.models';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import {
  BookingApiActions,
  BookingPageActions,
  ConfirmRequestPayload,
  DatePayload,
  MonthPayload,
} from './booking.actions';

export const loadMonthAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availability: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingPageActions.monthViewed),
      switchMap(({ month }: MonthPayload): Observable<Action> =>
        availability.getUnavailableDates(month).pipe(map((unavailableDates: string[]): Action =>
          BookingApiActions.monthAvailabilityLoaded({ month, unavailableDates })))),
    ),
  { functional: true },
);

export const loadSlots: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availability: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingPageActions.dateSelected),
      switchMap(({ date }: DatePayload): Observable<Action> =>
        availability.getSlots(date).pipe(
          map((slots: TimeSlot[]): Action =>
            BookingApiActions.slotsLoaded({ date, slots })),
          catchError((): Observable<Action> =>
            of(BookingApiActions.slotsLoadFailed({ error: 'Could not load times for that day.' }))),
        )),
    ),
  { functional: true },
);

export const confirmBooking: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    bookings: BookingService = inject(BookingService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingPageActions.confirmRequested),
      exhaustMap(({ request }: ConfirmRequestPayload): Observable<Action> =>
        bookings.create(request).pipe(
          map((confirmation: BookingConfirmation): Action => BookingApiActions.bookingConfirmed({ confirmation })),
          catchError((): Observable<Action> =>
            of(BookingApiActions.bookingFailed({ error: 'That booking didn’t go through. Please try again or call.' }))),
        )),
    ),
  { functional: true },
);
