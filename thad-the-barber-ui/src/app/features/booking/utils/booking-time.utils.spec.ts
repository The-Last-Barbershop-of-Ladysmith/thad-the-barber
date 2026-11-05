import { TEST_SHOP } from '../../../../testing/test-shop';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { DateRange } from '../models/date-range.model';
import {
  isFillingUp,
  toBookingWindow,
  toFirstMonth,
  toLongDate,
  toLongDateTime,
  toMonthRange,
} from './booking-time.utils';

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
  'toFirstMonth',
  (): void => {
    const now: Date = new Date('2026-11-01T05:00:00Z');

    function firstMonthFor(pickedStartAt: string | null): string | undefined {
      return toFirstMonth(
        TEST_SHOP.bookingSettings,
        HONOLULU,
        pickedStartAt,
        now,
      )?.firstDay;
    }

    it(
      "is today's month without a picked time",
      (): void => {
        expect(firstMonthFor(null)).toBe('2026-10-01');
      },
    );

    it(
      'is the month holding a picked time',
      (): void => {
        expect(firstMonthFor('2026-12-02T20:00:00Z')).toBe('2026-12-01');
      },
    );

    it(
      "reads the picked time's day on the shop's clock, not UTC",
      (): void => {
        // 05:00 UTC on Dec 1st is still Nov 30th in Honolulu.
        expect(firstMonthFor('2026-12-01T05:00:00Z')).toBe('2026-11-01');
      },
    );

    it(
      "is today's month for a picked time outside the booking window",
      (): void => {
        expect(firstMonthFor('2027-03-01T20:00:00Z')).toBe('2026-10-01');
        expect(firstMonthFor('2026-09-01T20:00:00Z')).toBe('2026-10-01');
      },
    );

    it(
      'is unknown until the shop has loaded',
      (): void => {
        expect(toFirstMonth(
          null,
          HONOLULU,
          null,
          now,
        )).toBeNull();
        expect(toFirstMonth(
          TEST_SHOP.bookingSettings,
          null,
          null,
          now,
        )).toBeNull();
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

describe(
  'isFillingUp',
  (): void => {
    it(
      'holds for a day with 1 to 4 open times, not for a closed or full day or one with 5 or more (BR-15)',
      (): void => {
        expect(isFillingUp(1)).toBe(true);
        expect(isFillingUp(4)).toBe(true);
        expect(isFillingUp(0)).toBe(false);
        expect(isFillingUp(5)).toBe(false);
      },
    );
  },
);
