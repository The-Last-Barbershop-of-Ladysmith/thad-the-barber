import { TEST_SHOP } from '../../../../testing/test-shop';
import { fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';
import { AvailableDay } from '../dtos/available-day.dto';
import { DateRange } from '../models/date-range.model';
import {
  FIRST_UPCOMING_VIEW,
  toBookingWindow,
  toDayRange,
  toLaterMonths,
  toLongDateTime,
  toTimeSlots,
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
  'toDayRange',
  (): void => {
    it(
      "asks for today on the shop's clock and the 30 days after it, across a month end",
      (): void => {
        // 05:00 UTC on Nov 1st is still Oct 31st in Honolulu.
        expect(toDayRange(
          FIRST_UPCOMING_VIEW,
          HONOLULU,
          new Date('2026-11-01T05:00:00Z'),
        )).toEqual({ firstDay: '2026-10-31', lastDay: '2026-11-30' });
      },
    );

    it(
      'runs the upcoming days across a year end and a leap day',
      (): void => {
        expect(toDayRange(
          FIRST_UPCOMING_VIEW,
          HONOLULU,
          new Date('2026-12-20T22:00:00Z'),
        )).toEqual({ firstDay: '2026-12-20', lastDay: '2027-01-19' });
        expect(toDayRange(
          FIRST_UPCOMING_VIEW,
          HONOLULU,
          new Date('2028-02-15T22:00:00Z'),
        )).toEqual({ firstDay: '2028-02-15', lastDay: '2028-03-16' });
      },
    );

    it(
      'pages the upcoming days in blocks of 31 from today',
      (): void => {
        expect(toDayRange(
          { month: null, upcomingPage: 1 },
          HONOLULU,
          new Date('2026-10-14T22:00:00Z'),
        )).toEqual({ firstDay: '2026-11-14', lastDay: '2026-12-14' });
        expect(toDayRange(
          { month: null, upcomingPage: 2 },
          HONOLULU,
          new Date('2026-10-14T22:00:00Z'),
        )).toEqual({ firstDay: '2026-12-15', lastDay: '2027-01-14' });
      },
    );

    it(
      "asks for a month's 1st through its last day",
      (): void => {
        expect(toDayRange({ month: '2026-11', upcomingPage: 0 }, HONOLULU)).toEqual({ firstDay: '2026-11-01', lastDay: '2026-11-30' });
        expect(toDayRange({ month: '2028-02', upcomingPage: 0 }, HONOLULU)).toEqual({ firstDay: '2028-02-01', lastDay: '2028-02-29' });
        expect(toDayRange({ month: '2026-12', upcomingPage: 0 }, null)).toEqual({ firstDay: '2026-12-01', lastDay: '2026-12-31' });
      },
    );
  },
);

describe(
  'toLaterMonths',
  (): void => {
    function window(min: string, max: string): DateRange {
      return { min: fromIsoDate(min), max: fromIsoDate(max) };
    }

    it(
      'lists every month after the first through the one the window ends in, across a year end',
      (): void => {
        expect(toLaterMonths(window('2026-10-27', '2027-10-27'))).toEqual([
          '2026-11',
          '2026-12',
          '2027-01',
          '2027-02',
          '2027-03',
          '2027-04',
          '2027-05',
          '2027-06',
          '2027-07',
          '2027-08',
          '2027-09',
          '2027-10',
        ]);
      },
    );

    it(
      'lists only the months a short window reaches into',
      (): void => {
        expect(toLaterMonths(window('2026-10-27', '2026-11-16'))).toEqual(['2026-11']);
        expect(toLaterMonths(window('2026-10-05', '2026-10-25'))).toEqual([]);
        expect(toLaterMonths(window('2026-10-31', '2026-11-01'))).toEqual(['2026-11']);
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
