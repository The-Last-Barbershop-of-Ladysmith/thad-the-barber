import { Weekday } from '../../core/models/shop/weekday.model';

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  [Weekday.Sunday]: 'Sunday',
  [Weekday.Monday]: 'Monday',
  [Weekday.Tuesday]: 'Tuesday',
  [Weekday.Wednesday]: 'Wednesday',
  [Weekday.Thursday]: 'Thursday',
  [Weekday.Friday]: 'Friday',
  [Weekday.Saturday]: 'Saturday',
};

export const WEEKDAY_SHORT_NAMES: Record<Weekday, string> = {
  [Weekday.Sunday]: 'Sun',
  [Weekday.Monday]: 'Mon',
  [Weekday.Tuesday]: 'Tue',
  [Weekday.Wednesday]: 'Wed',
  [Weekday.Thursday]: 'Thu',
  [Weekday.Friday]: 'Fri',
  [Weekday.Saturday]: 'Sat',
};

/** Monday-first order, so a run of weekdays reads "Monday – Friday". */
export const WEEK_FROM_MONDAY: readonly Weekday[] = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
  Weekday.Sunday,
];

/** Sunday-first, indexed like Date.getDay(). */
const WEEK_FROM_SUNDAY: readonly Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];

/** Any day number (including past 6 or negative) → its weekday, e.g. 8 → Monday. */
export function toWeekday(day: number): Weekday {
  // The index is always 0–6; the fallback only satisfies noUncheckedIndexedAccess.
  return WEEK_FROM_SUNDAY[((day % 7) + 7) % 7] ?? Weekday.Sunday;
}

/** "Monday – Friday", or just "Monday" for a single day. */
export function weekdaySpanLabel(
  first: Weekday,
  last: Weekday,
  names: Record<Weekday, string> = WEEKDAY_NAMES,
): string {
  return first === last ? names[first] : `${names[first]} – ${names[last]}`;
}
