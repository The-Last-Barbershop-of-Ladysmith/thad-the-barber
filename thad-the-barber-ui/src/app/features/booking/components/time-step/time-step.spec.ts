import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { TimeStep } from './time-step';
import { toMonthView } from '../../utils/booking-time.utils';

/** Made-up days on the test shop's Honolulu clock: 20:00 UTC is 10 AM there. */
const DAYS: AvailableDay[] = [
  { date: '2026-11-01', times: ['2026-11-01T20:00:00Z'] },
  {
    date: '2026-11-02', times: [
      '2026-11-02T20:00:00Z',
      '2026-11-02T20:30:00Z',
      '2026-11-02T21:00:00Z',
    ],
  },
  {
    date: '2026-11-03',
    times: [
      '2026-11-03T20:00:00Z',
      '2026-11-03T20:30:00Z',
      '2026-11-03T21:00:00Z',
      '2026-11-03T21:30:00Z',
      '2026-11-03T22:00:00Z',
    ],
  },
];

describe(
  'TimeStep',
  (): void => {
    function render(selectedDate: string | null): HTMLElement {
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
        ],
      });
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      store.dispatch(BookingActions.SetAvailabilityView({ availabilityView: toMonthView('2026-11') }));
      store.dispatch(BookingActions.AvailabilityRequestSuccess({ availabilityView: toMonthView('2026-11'), availableDays: DAYS }));
      const fixture: ComponentFixture<TimeStep> = TestBed.createComponent(TimeStep);
      fixture.componentRef.setInput('startAtControl', new FormControl<string | null>(null));
      fixture.componentRef.setInput('selectedDate', selectedDate);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function fillingUpNote(host: HTMLElement): string | undefined {
      return host.querySelector('[data-testid="filling-up-note"]')?.textContent.trim();
    }

    it(
      'says how few times are left on a day that is filling up (BR-15)',
      (): void => {
        expect(fillingUpNote(render('2026-11-01'))).toBe('Filling up: only 1 time left this day.');
      },
    );

    it(
      'counts the times in the note',
      (): void => {
        expect(fillingUpNote(render('2026-11-02'))).toBe('Filling up: only 3 times left this day.');
      },
    );

    it(
      'adds no note from 5 open times',
      (): void => {
        expect(fillingUpNote(render('2026-11-03'))).toBeUndefined();
      },
    );

    it(
      "lists the picked day's times on the shop's clock",
      (): void => {
        const labels: string[] = Array.from(render('2026-11-02').querySelectorAll('[data-testid="time-list"] [role="button"]'))
          .map((button: Element): string => button.textContent.trim());

        expect(labels).toEqual([
          '10:00 AM',
          '10:30 AM',
          '11:00 AM',
        ]);
      },
    );
  },
);
