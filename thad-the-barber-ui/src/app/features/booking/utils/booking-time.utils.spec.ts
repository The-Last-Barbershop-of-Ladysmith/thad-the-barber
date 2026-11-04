import { TEST_SHOP } from '../../../../testing/test-shop';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { DateRange } from '../models/date-range.model';
import { toBookingWindow, toLongDate, toLongDateTime, toMonthRange } from './booking-time.utils';

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
  'toMonthRange',
  (): void => {
    it(
      'covers a calendar month from its 1st through its last day, leap day and year end included',
      (): void => {
        expect(toMonthRange(2026, 11)).toEqual({ firstDay: '2026-11-01', lastDay: '2026-11-30' });
        expect(toMonthRange(2028, 2).lastDay).toBe('2028-02-29');
        expect(toMonthRange(2026, 12).lastDay).toBe('2026-12-31');
      },
    );
  },
);

describe(
  'toLongDate',
  (): void => {
    it(
      "shows the shop's date, not UTC's",
      (): void => {
        expect(toLongDate(HONOLULU, '2026-10-04T05:30:00Z')).toBe('Saturday, October 3');
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
