import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { DayRange } from '../models/day-range.model';
import { AvailabilityService } from '../services/availability.service';
import { toMonthView } from '../utils/booking-time.utils';
import * as BookingActions from './booking.actions';
import { loadAvailability } from './booking.effects';

const availableDays: AvailableDay[] = [{ date: '2026-02-03', times: ['2026-02-03T20:00:00Z'] }];
const february: AvailabilityView = toMonthView('2026-02');

describe(
  'loadAvailability',
  (): void => {
    let requestedRanges: DayRange[];

    function viewWith(getAvailableDays: () => Observable<AvailableDay[]>): Action[] {
      requestedRanges = [];
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
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
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadAvailability() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(BookingActions.SetAvailabilityView({ availabilityView: february }));
      return emitted;
    }

    it(
      "asks for the view's own days and stores what comes back",
      (): void => {
        expect(viewWith((): Observable<AvailableDay[]> => of(availableDays)))
          .toEqual([BookingActions.AvailabilityRequestSuccess({ availabilityView: february, availableDays })]);
        expect(requestedRanges).toEqual([february]);
        expect(february).toEqual(expect.objectContaining({ firstDay: '2026-02-01', lastDay: '2026-02-28' }));
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<AvailableDay[]> = (): Observable<AvailableDay[]> =>
          throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 503 }));
        expect(viewWith(failing)).toEqual([BookingActions.AvailabilityRequestFailure({ availabilityView: february })]);
      },
    );
  },
);
