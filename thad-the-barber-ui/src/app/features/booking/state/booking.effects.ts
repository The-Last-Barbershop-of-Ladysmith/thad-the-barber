import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { AvailabilityService } from '../services/availability.service';
import * as BookingActions from './booking.actions';

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
