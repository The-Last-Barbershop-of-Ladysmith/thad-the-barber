import {
  WEEKDAY_SHORT_NAMES,
  toWeekday,
  weekdaySpanLabel,
} from './weekday.utils';

describe(
  'weekday utils',
  (): void => {
    it(
      'wraps any day number into 0–6',
      (): void => {
        expect(toWeekday(8)).toBe(1);
        expect(toWeekday(-1)).toBe(6);
      },
    );

    it(
      'labels a single day or a span',
      (): void => {
        expect(weekdaySpanLabel(1, 1)).toBe('Monday');
        expect(weekdaySpanLabel(
          1,
          5,
          WEEKDAY_SHORT_NAMES,
        )).toBe('Mon – Fri');
      },
    );
  },
);
