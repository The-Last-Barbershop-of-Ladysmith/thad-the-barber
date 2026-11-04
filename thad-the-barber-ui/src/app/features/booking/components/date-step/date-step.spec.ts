import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { DatePickerDateMeta, DatePickerMonthChangeEvent } from 'primeng/types/datepicker';
import { testFirstMonth, testMonthView } from '../../../../../testing/test-availability';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { toIsoDate, toIsoDateIn } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { DayRange } from '../../models/day-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { DateStep } from './date-step';

/** The component's protected members the spec drives, read by name so the class stays unchanged. */
interface DateStepPage {
  closedDates: Signal<Date[]>;
  isFillingUp: (dateMeta: DatePickerDateMeta) => boolean;
  showMonth: (event: DatePickerMonthChangeEvent) => void;
}

const NOVEMBER: DayRange = testMonthView('2026-11');

/** One day with plenty of times and one filling up (fewer than 5). */
const OPEN_DAYS: AvailableDay[] = [
  {
    date: '2026-11-07',
    times: [
      '2026-11-07T20:00:00Z',
      '2026-11-07T20:30:00Z',
      '2026-11-07T21:00:00Z',
      '2026-11-07T21:30:00Z',
      '2026-11-07T22:00:00Z',
    ],
  },
  { date: '2026-11-08', times: ['2026-11-08T20:00:00Z'] },
];

describe(
  'DateStep',
  (): void => {
    let fixture: ComponentFixture<DateStep>;
    let page: DateStepPage;
    let store: Store<AppState>;
    let dateControl: FormControl<string | null>;
    let dispatched: Action[];

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
      dateControl = new FormControl<string | null>(null);
      fixture = TestBed.createComponent(DateStep);
      fixture.componentRef.setInput('dateControl', dateControl);
      fixture.detectChanges();
      page = fixture.componentInstance as unknown as DateStepPage;
    });

    function show(dayRange: DayRange): void {
      store.dispatch(BookingActions.AvailabilityRequest({ dayRange }));
      fixture.detectChanges();
    }

    function load(availableDays: AvailableDay[]): void {
      store.dispatch(BookingActions.AvailabilityRequestSuccess({ availableDays }));
      fixture.detectChanges();
    }

    function byTestId(testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    function closedDays(): string[] {
      return page.closedDates().map((closedDate: Date): string => toIsoDate(closedDate));
    }

    it(
      'closes every day of the month in view while it loads, then all but the open days',
      (): void => {
        show(NOVEMBER);
        expect(closedDays()).toHaveLength(30);
        expect(byTestId('dates-loading')).not.toBeNull();

        load(OPEN_DAYS);

        expect(closedDays()).toHaveLength(28);
        expect(closedDays()).not.toContain('2026-11-07');
        expect(closedDays()).not.toContain('2026-11-08');
        expect(byTestId('dates-loading')).toBeNull();
      },
    );

    it(
      'marks only an open day with fewer than 5 times as filling up',
      (): void => {
        show(NOVEMBER);
        load(OPEN_DAYS);

        expect(page.isFillingUp({
          year: 2026,
          month: 10,
          day: 8,
        })).toBe(true);
        expect(page.isFillingUp({
          year: 2026,
          month: 10,
          day: 7,
        })).toBe(false);
        expect(page.isFillingUp({
          year: 2026,
          month: 10,
          day: 9,
        })).toBe(false);
      },
    );

    it(
      'loads a month when the calendar moves to it',
      (): void => {
        page.showMonth({ year: 2026, month: 12 });
        page.showMonth({});

        expect(dispatched).toContainEqual(BookingActions.AvailabilityRequest({ dayRange: testMonthView('2026-12') }));
        expect(dispatched).toHaveLength(2);
      },
    );

    it(
      'picks an open day as a shop-calendar ISO day',
      (): void => {
        const today: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
        show(testFirstMonth());
        load([{ date: today, times: [`${today}T20:00:00Z`] }]);

        const openDay: HTMLElement | undefined = [
          ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
            'td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)',
          ),
        ][0];
        openDay?.click();

        expect(dateControl.value).toBe(today);
      },
    );

    it(
      'says when the month in view has no open days',
      (): void => {
        show(NOVEMBER);
        expect(byTestId('booking-notice')).toBeNull();

        load([]);

        expect(byTestId('booking-notice')).not.toBeNull();
      },
    );

    it(
      'reloads the month in view from the failed notice',
      (): void => {
        show(NOVEMBER);
        store.dispatch(BookingActions.AvailabilityRequestFailure());
        fixture.detectChanges();
        dispatched = [];

        byTestId('notice-retry')?.click();

        expect(dispatched).toEqual([BookingActions.AvailabilityRequest({ dayRange: NOVEMBER })]);
      },
    );
  },
);
