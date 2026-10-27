import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action, Store, provideStore } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TEST_SHOP } from '../../../../testing/test-shop';
import { AppState } from '../../../store/app.state';
import * as ShopActions from '../../shop/state/shop.actions';
import { shopFeature } from '../../shop/state/shop.feature';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';
import { AvailabilityService } from '../services/availability.service';
import { toDayRange } from '../utils/booking-time.utils';
import * as BookingActions from './booking.actions';
import { loadMonthAvailability } from './booking.effects';

const availableDays: AvailableDay[] = [{ date: '2026-10-03', times: ['2026-10-03T20:00:00Z'] }];

describe(
  'loadMonthAvailability',
  (): void => {
    let requestedRanges: DayRange[];

    function viewWith(
      month: string | null,
      getAvailableDays: () => Observable<AvailableDay[]>,
    ): Action[] {
      requestedRanges = [];
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
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
      TestBed.inject<Store<AppState>>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadMonthAvailability() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(BookingActions.SetActiveMonthView({ month }));
      return emitted;
    }

    it(
      "stores the month's open days, asking for its 1st through its last day",
      (): void => {
        expect(viewWith('2026-02', (): Observable<AvailableDay[]> => of(availableDays)))
          .toEqual([BookingActions.MonthAvailabilityRequestSuccess({ month: '2026-02', availableDays })]);
        expect(requestedRanges).toEqual([{ firstDay: '2026-02-01', lastDay: '2026-02-28' }]);
      },
    );

    it(
      "asks for the upcoming days from today on the shop's clock",
      (): void => {
        viewWith(null, (): Observable<AvailableDay[]> => of(availableDays));

        expect(requestedRanges).toEqual([toDayRange(null, TEST_SHOP.timeZone)]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<AvailableDay[]> = (): Observable<AvailableDay[]> =>
          throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 503 }));
        expect(viewWith('2026-10', failing))
          .toEqual([BookingActions.MonthAvailabilityRequestFailure({ month: '2026-10' })]);
      },
    );
  },
);
