import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  Observable,
  Subject,
  of,
  throwError,
} from 'rxjs';
import { AvailableDay } from '../models/available-day.model';
import { AvailabilityService } from '../services/availability.service';
import * as BookingActions from './booking.actions';
import { loadMonthAvailability } from './booking.effects';

const availableDays: AvailableDay[] = [{ date: '2026-10-03', times: ['2026-10-03T20:00:00Z'] }];

describe(
  'loadMonthAvailability',
  (): void => {
    function viewWith(getAvailableDays: (month: string) => Observable<AvailableDay[]>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: AvailabilityService, useValue: { getAvailableDays } },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadMonthAvailability() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(BookingActions.SetActiveMonthView({ month: '2026-10' }));
      return emitted;
    }

    it(
      "stores the month's open days",
      (): void => {
        expect(viewWith((): Observable<AvailableDay[]> => of(availableDays)))
          .toEqual([BookingActions.MonthAvailabilityRequestSuccess({ month: '2026-10', availableDays })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<AvailableDay[]> = (): Observable<AvailableDay[]> =>
          throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 503 }));
        expect(viewWith(failing)).toEqual([BookingActions.MonthAvailabilityRequestFailure({ month: '2026-10' })]);
      },
    );
  },
);
