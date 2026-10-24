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
import {
  BookingConfirmation,
  BookingRequest,
  TimeSlot,
} from '../models/booking.models';
import { AvailabilityService } from '../services/availability.service';
import { BookingService } from '../services/booking.service';
import * as BookingActions from './booking.actions';

export const loadMonthAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availability: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.MonthView),
      switchMap(({ month }: { month: string; }): Observable<Action> =>
        availability.getUnavailableDates(month).pipe(map((unavailableDates: string[]): Action =>
          BookingActions.MonthAvailabilityRequestSuccess({ month, unavailableDates })))),
    ),
  { functional: true },
);

export const loadSlots: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availability: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.DateSelect),
      switchMap(({ date }: { date: string; }): Observable<Action> =>
        availability.getSlots(date).pipe(
          map((slots: TimeSlot[]): Action =>
            BookingActions.SlotsRequestSuccess({ date, slots })),
          catchError((): Observable<Action> =>
            of(BookingActions.SlotsRequestFailure({ error: 'Could not load times for that day.' }))),
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
      ofType(BookingActions.BookingConfirmRequest),
      exhaustMap(({ request }: { request: BookingRequest; }): Observable<Action> =>
        bookings.create(request).pipe(
          map((confirmation: BookingConfirmation): Action =>
            BookingActions.BookingConfirmRequestSuccess({ confirmation })),
          catchError((): Observable<Action> =>
            of(BookingActions.BookingConfirmRequestFailure({ error: 'That booking didn’t go through. Please try again or call.' }))),
        )),
    ),
  { functional: true },
);
