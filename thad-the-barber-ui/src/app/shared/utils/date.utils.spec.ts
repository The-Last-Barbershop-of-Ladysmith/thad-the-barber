import { Weekday } from '../../core/models/shop/weekday.model';
import {
  formatLongDate,
  formatShortDate,
  fromTimeOfDay,
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
  },
);
