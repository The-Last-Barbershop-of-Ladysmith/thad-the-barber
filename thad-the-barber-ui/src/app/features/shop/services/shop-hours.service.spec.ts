import { TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../testing/test-shop';
import * as ShopActions from '../state/shop.actions';
import { shopFeature } from '../state/shop.feature';
import { HoursRow } from '../models/hours-row.model';
import { ShopInfo } from '../models/shop-info.model';
import { Weekday } from '../../../shared/models/weekday.model';
import { ShopHoursService } from './shop-hours.service';

describe(
  'ShopHoursService',
  (): void => {
    let service: ShopHoursService;

    function loadShop(): void {
      TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      service = TestBed.inject(ShopHoursService);
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    describe(
      'before the shop loads',
      (): void => {
        it(
          'has no hours and no status',
          (): void => {
            expect(service.businessHours()).toEqual([]);
            expect(service.currentOpenStatus()).toBeNull();
          },
        );
      },
    );

    describe(
      'once the shop loads',
      (): void => {
        beforeEach(loadShop);

        it(
          'is open during Saturday hours',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 12 * 60 })).toEqual({ isOpen: true, label: 'Open now' });
          },
        );

        it(
          'announces a same-day opening before 10 AM',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Sunday, minutes: 8 * 60 + 30 }).label).toBe('Opens today at 10 AM');
          },
        );

        it(
          'points to Sunday after Saturday closes',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 19 * 60 + 30 }).label).toBe('Closed · Opens Sun 10 AM');
          },
        );

        it(
          'points to Saturday on a weekday',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Monday, minutes: 12 * 60 })).toEqual({
              isOpen: false,
              label: 'Closed · Opens Sat 10 AM',
            });
          },
        );

        it(
          "reads the live status on the shop's clock, not the browser's",
          (): void => {
            // Sunday 05:00 UTC is still Saturday 7 PM in Honolulu, half an hour before closing.
            vi.useFakeTimers({ now: new Date('2026-09-27T05:00:00Z'), toFake: ['Date'] });
            const fresh: ShopHoursService = TestBed.runInInjectionContext(
              (): ShopHoursService => new ShopHoursService(),
            );

            expect(fresh.currentOpenStatus()).toEqual({ isOpen: true, label: 'Open now' });
          },
        );

        it(
          'lists open days then one closed row',
          (): void => {
            expect(service.businessHours().map((row: HoursRow): string => `${row.label}: ${row.range}`)).toEqual([
              'Saturday: 10:00 AM – 7:30 PM',
              'Sunday: 10:00 AM – 4:00 PM',
              'Monday – Friday: Closed',
            ]);
          },
        );

        it(
          'keeps the minutes in short ranges only when they are not on the hour',
          (): void => {
            expect(service.businessHours()[0]?.shortRange).toBe('10 AM – 7:30 PM');
          },
        );
      },
    );
    describe(
      'with several periods a day, sent out of order',
      (): void => {
        // Closed for lunch on Saturday, and Square lists Sunday first.
        const splitShop: ShopInfo = {
          ...TEST_SHOP,
          hours: [
            {
              day: Weekday.Sunday,
              opens: '10:00:00',
              closes: '16:00:00',
            },
            {
              day: Weekday.Saturday,
              opens: '13:00:00',
              closes: '19:45:00',
            },
            {
              day: Weekday.Saturday,
              opens: '09:30:00',
              closes: '12:00:00',
            },
          ],
        };

        beforeEach((): void => {
          TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: splitShop }));
        });

        it(
          'is open during the second period',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 14 * 60 }).isOpen).toBe(true);
          },
        );

        it(
          'announces the next period during the break',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 12 * 60 + 30 }).label)
              .toBe('Opens today at 1 PM');
          },
        );

        it(
          'shows one row per day, Saturday before Sunday, with both periods on it',
          (): void => {
            expect(service.businessHours().map((row: HoursRow): string => `${row.label}: ${row.range}`)).toEqual([
              'Saturday: 9:30 AM – 12:00 PM, 1:00 PM – 7:45 PM',
              'Sunday: 10:00 AM – 4:00 PM',
              'Monday – Friday: Closed',
            ]);
          },
        );
      },
    );
  },
);
