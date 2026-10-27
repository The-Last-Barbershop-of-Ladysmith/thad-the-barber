import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { AppState } from '../../../store/app.state';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../models/available-day.model';
import { AvailabilityService } from '../services/availability.service';
import { toDayRange } from '../utils/booking-time.utils';
import * as BookingActions from './booking.actions';

/** Asks for the view's days on the shop's clock; until the shop loads, "today" is the browser's. */
export const loadMonthAvailability: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    store: Store<AppState> = inject<Store<AppState>>(Store),
    availabilityService: AvailabilityService = inject(AvailabilityService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(BookingActions.SetActiveMonthView),
      withLatestFrom(store.select(shopFeature.selectTimeZone)),
      switchMap(([{ month }, timeZone]: [{ month: string | null; }, string | null]): Observable<Action> =>
        availabilityService.getAvailableDays(toDayRange(month, timeZone)).pipe(
          map((availableDays: AvailableDay[]): Action =>
            BookingActions.MonthAvailabilityRequestSuccess({ month, availableDays })),
          catchError((): Observable<Action> =>
            of(BookingActions.MonthAvailabilityRequestFailure({ month }))),
        )),
    ),
  { functional: true },
);
