import { formatLongDate, formatShortDate } from './date.utils';

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
  },
);
