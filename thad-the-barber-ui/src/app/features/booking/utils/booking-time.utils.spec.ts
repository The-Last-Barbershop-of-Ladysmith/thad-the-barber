import { TEST_SHOP } from '../../../../testing/test-shop';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { AvailableDay } from '../models/available-day.model';
import { DateRange } from '../models/date-range.model';
import { toBookingWindow, toLongDateTime, toTimeSlots } from './booking-time.utils';

const HONOLULU: string = TEST_SHOP.timeZone;

describe(
  'toBookingWindow',
  (): void => {
    it(
      "runs from today on the shop's clock to the furthest day it books",
      (): void => {
        // 05:00 UTC on Nov 1st is still Oct 31st in Honolulu.
        const window: DateRange | null = toBookingWindow(
          TEST_SHOP.bookingSettings,
          HONOLULU,
          new Date('2026-11-01T05:00:00Z'),
        );

        expect(window && toIsoDate(window.min)).toBe('2026-10-31');
        expect(window && toIsoDate(window.max)).toBe('2026-12-15');
      },
    );

    it(
      'has no window until the shop has loaded',
      (): void => {
        expect(toBookingWindow(null, HONOLULU)).toBeNull();
        expect(toBookingWindow(TEST_SHOP.bookingSettings, null)).toBeNull();
      },
    );
  },
);

describe(
  'toTimeSlots',
  (): void => {
    const availableDays: AvailableDay[] = [{ date: '2026-10-03', times: ['2026-10-03T20:00:00Z', '2026-10-04T05:30:00Z'] }];

    it(
      "labels the picked day's times on the shop's clock",
      (): void => {
        expect(toTimeSlots(
          availableDays,
          '2026-10-03',
          HONOLULU,
        )).toEqual([
          { startAt: '2026-10-03T20:00:00Z', label: '10:00 AM' },
          { startAt: '2026-10-04T05:30:00Z', label: '7:30 PM' },
        ]);
      },
    );

    it(
      'has none for a day outside the month in view, or before the shop has loaded',
      (): void => {
        expect(toTimeSlots(
          availableDays,
          '2026-11-03',
          HONOLULU,
        )).toEqual([]);
        expect(toTimeSlots(
          availableDays,
          '2026-10-03',
          null,
        )).toEqual([]);
      },
    );
  },
);

describe(
  'toLongDateTime',
  (): void => {
    it(
      "shows the shop's date and time, not UTC's",
      (): void => {
        expect(toLongDateTime(HONOLULU, '2026-10-04T05:30:00Z')).toBe('Saturday, October 3 at 7:30 PM');
      },
    );
  },
);
