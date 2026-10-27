import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { DateRange } from '../../models/date-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { toBookingWindow, toLaterMonths } from '../../utils/booking-time.utils';
import { DateStep } from './date-step';

/** Made-up open days, out of order on purpose, as the slice could hold them after a merge. */
const OPEN_DAYS: AvailableDay[] = [
  { date: '2026-11-21', times: ['2026-11-21T20:00:00Z'] },
  { date: '2026-11-01', times: ['2026-11-01T20:00:00Z'] },
];

describe(
  'DateStep',
  (): void => {
    let fixture: ComponentFixture<DateStep>;
    let store: Store<AppState>;
    let dateControl: FormControl<string | null>;
    let startAtControl: FormControl<string | null>;
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
      startAtControl = new FormControl<string | null>('2026-11-01T20:00:00Z');
      fixture = TestBed.createComponent(DateStep);
      fixture.componentRef.setInput('dateControl', dateControl);
      fixture.componentRef.setInput('startAtControl', startAtControl);
      fixture.detectChanges();
    });

    function load(availableDays: AvailableDay[], month: string | null = null): void {
      store.dispatch(BookingActions.MonthAvailabilityRequestSuccess({ month, availableDays }));
      fixture.detectChanges();
    }

    function find(testId: string): HTMLElement | null {
      return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    function dayButtons(): HTMLElement[] {
      return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.date-list .p-togglebutton')];
    }

    function laterMonths(): string[] {
      const bookingWindow: DateRange | null = toBookingWindow(TEST_SHOP.bookingSettings, TEST_SHOP.timeZone);
      return bookingWindow ? toLaterMonths(bookingWindow) : [];
    }

    it(
      'shows the next 31 days first, with previous disabled',
      (): void => {
        expect(find('view-picker')?.textContent).toContain('Next 31 days');
        expect(find('previous-view')?.hasAttribute('disabled')).toBe(true);
      },
    );

    it(
      'lists the open days written in full, and picking one clears a time picked for another day',
      (): void => {
        load(OPEN_DAYS);

        expect(dayButtons().map((button: HTMLElement): string | undefined =>
          button.querySelector('.date-label')?.textContent.trim())).toEqual([
          'Saturday, November 21st 2026',
          'Sunday, November 1st 2026',
        ]);
        expect(dayButtons()[0]?.querySelector('[data-testid="filling-up"]')?.textContent).toContain('Only 1 left');
        expect(find('view-caption')?.textContent).toContain('2 open days');

        dayButtons()[1]?.click();
        fixture.detectChanges();

        expect(dateControl.value).toBe('2026-11-01');
        expect(startAtControl.value).toBeNull();
      },
    );

    it(
      'marks a day with fewer than 5 open times as filling up, in its accessible name too (BR-15)',
      (): void => {
        const timesFor: (count: number, date: string) => string[] = (count: number, date: string): string[] =>
          Array.from({ length: count }, (_: unknown, index: number): string => `${date}T2${index}:00:00Z`);
        load([
          { date: '2026-11-01', times: timesFor(1, '2026-11-01') },
          { date: '2026-11-02', times: timesFor(4, '2026-11-02') },
          { date: '2026-11-03', times: timesFor(5, '2026-11-03') },
          { date: '2026-11-04', times: timesFor(6, '2026-11-04') },
        ]);

        expect(dayButtons().map((button: HTMLElement): string | undefined =>
          button.querySelector('[data-testid="filling-up"]')?.textContent.trim())).toEqual([
          'Only 1 left',
          'Only 4 left',
          undefined,
          undefined,
        ]);
        expect(dayButtons()[1]?.getAttribute('aria-label')).toBe('Monday, November 2nd 2026, only 4 left');
        expect(dayButtons()[2]?.getAttribute('aria-label')).toBe('Tuesday, November 3rd 2026, 5 open');
      },
    );

    it(
      'shows the no-open-days notice instead of an empty list',
      (): void => {
        load([]);

        expect(dayButtons()).toHaveLength(0);
        expect(find('booking-notice')?.textContent).toContain('No open times');
      },
    );

    it(
      'steps to the next later month and back to the next 31 days',
      (): void => {
        const [firstLaterMonth]: string[] = laterMonths();
        load(OPEN_DAYS);

        find('next-view')?.click();
        load(OPEN_DAYS, firstLaterMonth ?? null);
        find('previous-view')?.click();

        expect(dispatched.slice(-3)).toEqual([
          BookingActions.SetActiveMonthView({ month: firstLaterMonth ?? null }),
          BookingActions.MonthAvailabilityRequestSuccess({ month: firstLaterMonth ?? null, availableDays: OPEN_DAYS }),
          BookingActions.SetActiveMonthView({ month: null }),
        ]);
      },
    );

    it(
      'offers the next 31 days and every later month the booking window reaches, and jumps with one load',
      async (): Promise<void> => {
        const months: string[] = laterMonths();
        const lastMonth: string | undefined = months.at(-1);

        find('view-picker')?.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(find('upcoming-view')).not.toBeNull();
        for (const month of months) {
          expect(find(`month-${month}`)).not.toBeNull();
        }
        find(`month-${lastMonth}`)?.click();

        expect(dispatched.at(-1)).toEqual(BookingActions.SetActiveMonthView({ month: lastMonth ?? null }));
      },
    );

    it(
      'clears the picked day and time when another view opens, since its days differ',
      (): void => {
        load(OPEN_DAYS);
        dateControl.setValue('2026-11-01');

        find('next-view')?.click();

        expect(dateControl.value).toBeNull();
        expect(startAtControl.value).toBeNull();
      },
    );
  },
);
