import { Weekday } from '../models/weekday.model';

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
export const WEEK_FROM_SUNDAY: readonly Weekday[] = [
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

/**
 * Groups days into runs of neighbours in a week that wraps from Sunday to Monday, so closed Mon and Wed are two
 * runs and closed Sat, Sun and Mon are one. Each run is in week order, starting at its first day.
 */
export function toDayRuns(days: readonly Weekday[]): Weekday[][] {
  const firstRunStart: Weekday | undefined = WEEK_FROM_MONDAY.find(
    (day: Weekday): boolean => days.includes(day) && !days.includes(toWeekday(day - 1)),
  );
  if (firstRunStart === undefined) {
    return days.length === 0 ? [] : [[...WEEK_FROM_MONDAY]];
  }
  const runs: Weekday[][] = [];
  for (let offset: number = 0; offset < 7; offset++) {
    const day: Weekday = toWeekday(firstRunStart + offset);
    if (!days.includes(day)) {
      continue;
    }
    const lastRun: Weekday[] | undefined = runs.at(-1);
    if (lastRun !== undefined && days.includes(toWeekday(day - 1))) {
      lastRun.push(day);
    } else {
      runs.push([day]);
    }
  }
  return runs;
}
