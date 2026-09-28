import { type Weekday } from '../../core/models/shop.models';

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const WEEKDAY_SHORT_NAMES: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/** Monday-first order, so a run of weekdays reads "Monday – Friday". */
export const WEEK_FROM_MONDAY: readonly Weekday[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  0,
];

/** Any day number (including past 6 or negative) → 0–6, e.g. 8 → 1. */
export function toWeekday(day: number): Weekday {
  return (((day % 7) + 7) % 7) as Weekday;
}

/** "Monday – Friday", or just "Monday" for a single day. */
export function weekdaySpanLabel(
  first: Weekday,
  last: Weekday,
  names: Record<Weekday, string> = WEEKDAY_NAMES,
): string {
  return first === last ? names[first] : `${names[first]} – ${names[last]}`;
}
