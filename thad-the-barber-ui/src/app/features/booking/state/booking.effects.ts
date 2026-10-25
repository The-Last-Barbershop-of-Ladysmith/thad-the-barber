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
  map,
  of,
  switchMap,
} from 'rxjs';
import { AvailableDay } from '../models/available-day.model';
import { AvailabilityService } from '../services/availability.service';
import * as BookingActions from './booking.actions';

export const loadMonthAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    availabilityService: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.SetActiveMonthView),
      switchMap(({ month }: { month: string; }): Observable<Action> =>
        availabilityService.getAvailableDays(month).pipe(
          map((availableDays: AvailableDay[]): Action =>
            BookingActions.MonthAvailabilityRequestSuccess({ month, availableDays })),
          catchError((): Observable<Action> =>
            of(BookingActions.MonthAvailabilityRequestFailure({ month }))),
        )),
    ),
  { functional: true },
);
