import { Weekday } from '../models/weekday.model';
import {
  formatFullDate,
  formatLongDate,
  formatMonthDay,
  formatMonthYear,
  formatShortDate,
  formatShortMonth,
  fromIsoDate,
  fromTimeOfDay,
  toIsoDate,
  toIsoDateIn,
  currentDateForTimeZone,
  weekTimeIn,
} from './date.utils';

describe(
  'date utils',
  (): void => {
    const saturday: Date = new Date(
      2026,
      9,
      3,
    );

    it(
      'formats a long date label',
      (): void => {
        expect(formatLongDate(saturday)).toBe('Saturday, October 3');
      },
    );

    it(
      'formats a short date label',
      (): void => {
        expect(formatShortDate(saturday)).toBe('Sat, Oct 3');
      },
    );

    it(
      'writes a full date with its ordinal and year',
      (): void => {
        const fullDates: Record<string, string> = {
          '2026-10-01': 'Thursday, October 1st 2026',
          '2026-10-02': 'Friday, October 2nd 2026',
          '2026-10-03': 'Saturday, October 3rd 2026',
          '2026-10-04': 'Sunday, October 4th 2026',
          '2026-10-11': 'Sunday, October 11th 2026',
          '2026-10-12': 'Monday, October 12th 2026',
          '2026-10-13': 'Tuesday, October 13th 2026',
          '2026-10-21': 'Wednesday, October 21st 2026',
          '2026-10-22': 'Thursday, October 22nd 2026',
          '2026-10-23': 'Friday, October 23rd 2026',
          '2026-10-31': 'Saturday, October 31st 2026',
          '2028-02-29': 'Tuesday, February 29th 2028',
        };
        for (const [isoDate, fullDate] of Object.entries(fullDates)) {
          expect(formatFullDate(fromIsoDate(isoDate))).toBe(fullDate);
        }
      },
    );

    it(
      'formats month labels',
      (): void => {
        expect(formatMonthYear(saturday)).toBe('October 2026');
        expect(formatShortMonth(saturday)).toBe('Oct');
        expect(formatMonthDay(saturday)).toBe('Oct 3');
      },
    );

    it(
      'turns a time of day into minutes after midnight, with or without seconds',
      (): void => {
        expect(fromTimeOfDay('19:30:00')).toBe(1170);
        expect(fromTimeOfDay('00:05')).toBe(5);
      },
    );

    it(
      'rejects a time it cannot read',
      (): void => {
        expect((): number => fromTimeOfDay('noon')).toThrow();
      },
    );

    it(
      "reads the weekday and time on another timezone's clock",
      (): void => {
        // Sunday 05:00 UTC is Saturday 7 PM in Honolulu and Sunday 1 AM in New York (still on summer time).
        const instant: Date = new Date('2026-09-27T05:00:00Z');

        expect(weekTimeIn('Pacific/Honolulu', instant)).toEqual({ day: Weekday.Saturday, minutes: 19 * 60 });
        expect(weekTimeIn('America/New_York', instant)).toEqual({ day: Weekday.Sunday, minutes: 60 });
      },
    );

    it(
      'reads midnight as minute 0, not 24:00',
      (): void => {
        expect(weekTimeIn('UTC', new Date('2026-09-27T00:00:00Z'))).toEqual({ day: Weekday.Sunday, minutes: 0 });
      },
    );

    it(
      "reads the calendar day on another timezone's clock",
      (): void => {
        // 05:00 UTC on the 1st is still the last day of the month before in Honolulu.
        const instant: Date = new Date('2026-11-01T05:00:00Z');

        expect(toIsoDateIn('Pacific/Honolulu', instant)).toBe('2026-10-31');
        expect(toIsoDateIn('UTC', instant)).toBe('2026-11-01');
      },
    );

    it(
      "reads today on the timezone's clock, or the browser's while it's unknown",
      (): void => {
        vi.useFakeTimers({ now: new Date('2026-11-01T05:00:00Z') });

        expect(currentDateForTimeZone('Pacific/Honolulu')).toBe('2026-10-31');
        expect(currentDateForTimeZone(null)).toBe(toIsoDate(new Date()));

        vi.useRealTimers();
      },
    );
  },
);
