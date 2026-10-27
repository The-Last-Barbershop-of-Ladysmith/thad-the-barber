import { TEST_SHOP } from '../../../../testing/test-shop';
import { fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';
import { AvailableDay } from '../dtos/available-day.dto';
import { DateRange } from '../models/date-range.model';
import {
  isSameView,
  toBookingWindow,
  toMonthView,
  toUpcomingView,
  toLaterMonths,
  toLongDateTime,
  toTimeSlots,
} from './booking-time.utils';
import { AvailabilityViewKind } from '../models/availability-view-kind.model';

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
  'availability views',
  (): void => {
    const window: DateRange = { min: fromIsoDate('2026-10-14'), max: fromIsoDate('2027-10-14') };

    it(
      'makes a 31-day block from its first day, across a month and year end',
      (): void => {
        expect(toUpcomingView(fromIsoDate('2026-10-14'), window)).toEqual({
          kind: AvailabilityViewKind.Upcoming,
          firstDay: '2026-10-14',
          lastDay: '2026-11-13',
        });
        expect(toUpcomingView(fromIsoDate('2026-12-15'), window).lastDay).toBe('2027-01-14');
      },
    );

    it(
      "cuts a 31-day block at the booking window's last day",
      (): void => {
        expect(toUpcomingView(fromIsoDate('2027-10-01'), window).lastDay).toBe('2027-10-14');
      },
    );

    it(
      'makes a month view from its 1st through its last day, leap day included',
      (): void => {
        expect(toMonthView('2026-11')).toEqual({
          kind: AvailabilityViewKind.Month,
          firstDay: '2026-11-01',
          lastDay: '2026-11-30',
        });
        expect(toMonthView('2028-02').lastDay).toBe('2028-02-29');
      },
    );

    it(
      'tells views apart by kind and days',
      (): void => {
        expect(isSameView(toMonthView('2026-11'), toMonthView('2026-11'))).toBe(true);
        expect(isSameView(toMonthView('2026-11'), toMonthView('2026-12'))).toBe(false);
        expect(isSameView(toUpcomingView(fromIsoDate('2026-11-01'), window), toMonthView('2026-11'))).toBe(false);
        expect(isSameView(null, toMonthView('2026-11'))).toBe(false);
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
