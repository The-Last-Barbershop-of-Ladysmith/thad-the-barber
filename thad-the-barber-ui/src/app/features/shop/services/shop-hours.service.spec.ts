import { TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../testing/test-shop';
import * as ShopActions from '../state/shop.actions';
import { shopFeature } from '../state/shop.feature';
import { HoursRow } from '../models/hours-row.model';
import { OpenStatus } from '../models/open-status.model';
import { ShopInfo } from '../models/shop-info.model';
import { Weekday } from '../../../shared/models/weekday.model';
import { ShopHoursService } from './shop-hours.service';

describe(
  'ShopHoursService',
  (): void => {
    let service: ShopHoursService;

    function toLine(row: HoursRow): string {
      return row.isClosed ? `${row.label}: closed` : `${row.label}: ${row.range}`;
    }

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
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 12 * 60 })).toEqual({
              isOpen: true,
              label: 'Open now · closes 7:30 PM',
            });
          },
        );

        it(
          'is closed at the minute the shop closes',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 19 * 60 + 30 }).isOpen).toBe(false);
          },
        );

        it(
          'is open at the minute the shop opens',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Sunday, minutes: 10 * 60 }).isOpen).toBe(true);
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

            expect(fresh.currentOpenStatus()).toEqual({
              isOpen: true,
              label: 'Open now · closes 7:30 PM',
            });
          },
        );

        it(
          'lists open days then one closed row',
          (): void => {
            expect(service.businessHours().map((row: HoursRow): string => toLine(row))).toEqual([
              'Saturday: 10:00 AM – 7:30 PM',
              'Sunday: 10:00 AM – 4:00 PM',
              'Monday – Friday: closed',
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
          'names the closing time of the period it is in',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Saturday, minutes: 10 * 60 }).label)
              .toBe('Open now · closes 12 PM');
          },
        );

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
            expect(service.businessHours().map((row: HoursRow): string => toLine(row))).toEqual([
              'Saturday: 9:30 AM – 12:00 PM, 1:00 PM – 7:45 PM',
              'Sunday: 10:00 AM – 4:00 PM',
              'Monday – Friday: closed',
            ]);
          },
        );
      },
    );

    describe(
      'in a time zone that changes its clocks',
      (): void => {
        const newYorkShop: ShopInfo = {
          ...TEST_SHOP,
          timeZone: 'America/New_York',
        };

        function statusAt(instant: string): OpenStatus | null {
          vi.useFakeTimers({ now: new Date(instant), toFake: ['Date'] });
          return TestBed.runInInjectionContext((): ShopHoursService => new ShopHoursService()).currentOpenStatus();
        }

        beforeEach((): void => {
          TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: newYorkShop }));
        });

        it(
          'is still closed at 9:30 AM on the Sunday the clocks go back',
          (): void => {
            expect(statusAt('2026-11-01T14:30:00Z')?.label).toBe('Opens today at 10 AM');
          },
        );

        it(
          'is already open at 10:30 AM on the Sunday the clocks go forward',
          (): void => {
            expect(statusAt('2026-03-08T14:30:00Z')?.label).toBe('Open now · closes 4 PM');
          },
        );
      },
    );

    describe(
      'with a period that runs past midnight',
      (): void => {
        const lateShop: ShopInfo = {
          ...TEST_SHOP,
          hours: [
            {
              day: Weekday.Friday,
              opens: '18:00:00',
              closes: '02:00:00',
            },
          ],
        };

        beforeEach((): void => {
          TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: lateShop }));
        });

        it(
          'never counts as open, because the shop is expected to close the same day',
          (): void => {
            expect(service.getShopCurrentStatus({ day: Weekday.Friday, minutes: 20 * 60 }).isOpen).toBe(false);
          },
        );
      },
    );

    describe(
      'with closed days that are not neighbours',
      (): void => {
        const midweekShop: ShopInfo = {
          ...TEST_SHOP,
          hours: [
            {
              day: Weekday.Wednesday,
              opens: '09:00:00',
              closes: '17:00:00',
            },
            {
              day: Weekday.Saturday,
              opens: '10:00:00',
              closes: '14:00:00',
            },
          ],
        };

        beforeEach((): void => {
          TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: midweekShop }));
        });

        it(
          'gives each run of closed days its own row, joining Sunday to Monday',
          (): void => {
            expect(service.businessHours().map(toLine)).toEqual([
              'Wednesday: 9:00 AM – 5:00 PM',
              'Saturday: 10:00 AM – 2:00 PM',
              'Thursday – Friday: closed',
              'Sunday – Tuesday: closed',
            ]);
          },
        );
      },
    );
  },
);
