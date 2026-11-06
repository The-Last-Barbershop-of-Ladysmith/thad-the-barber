import { Weekday } from '../models/weekday.model';
import { WEEKDAY_SHORT_NAMES, WEEK_FROM_MONDAY, toDayRuns, toWeekday, weekdaySpanLabel } from './weekday.utils';

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
        expect(weekdaySpanLabel(Weekday.Monday, Weekday.Monday)).toBe('Monday');
        expect(weekdaySpanLabel(
          Weekday.Monday,
          Weekday.Friday,
          WEEKDAY_SHORT_NAMES,
        )).toBe('Mon – Fri');
      },
    );

    it(
      'groups neighbouring days into one run',
      (): void => {
        expect(toDayRuns([
          Weekday.Tuesday,
          Weekday.Monday,
          Weekday.Wednesday,
        ])).toEqual([
          [
            Weekday.Monday,
            Weekday.Tuesday,
            Weekday.Wednesday,
          ],
        ]);
      },
    );

    it(
      'splits days that are not neighbours into separate runs',
      (): void => {
        expect(toDayRuns([
          Weekday.Monday,
          Weekday.Wednesday,
          Weekday.Thursday,
          Weekday.Saturday,
        ])).toEqual([
          [Weekday.Monday],
          [Weekday.Wednesday, Weekday.Thursday],
          [Weekday.Saturday],
        ]);
      },
    );

    it(
      'joins Sunday to the Monday after it, in week order',
      (): void => {
        expect(toDayRuns([
          Weekday.Sunday,
          Weekday.Monday,
          Weekday.Tuesday,
          Weekday.Thursday,
        ])).toEqual([
          [Weekday.Thursday],
          [
            Weekday.Sunday,
            Weekday.Monday,
            Weekday.Tuesday,
          ],
        ]);
      },
    );

    it(
      'keeps a whole closed week as one run and no days as none',
      (): void => {
        expect(toDayRuns([...WEEK_FROM_MONDAY])).toHaveLength(1);
        expect(toDayRuns([])).toEqual([]);
      },
    );
  },
);
