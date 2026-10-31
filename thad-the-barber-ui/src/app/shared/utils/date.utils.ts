import { formatDate } from '@angular/common';
import { WeekTime } from '../models/week-time.model';
import { Weekday } from '../models/weekday.model';
import { WEEKDAY_SHORT_NAMES, WEEK_FROM_SUNDAY } from './weekday.utils';

/** Local-time date helpers. The store keeps dates as ISO strings so state stays serializable. */

/** Locale for display labels. They use `formatDate`, the same formatter behind Angular's `DatePipe`. */
const DATE_LOCALE: string = 'en-US';

/** Day-of-month endings by last digit; every other digit, and 11–13, take "th". */
const ORDINAL_SUFFIXES: Record<number, string> = {
  1: 'st',
  2: 'nd',
  3: 'rd',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "2026-10-03" → [2026, 10, 3]. Throws on anything that isn't `count` dash-separated numbers. */
function parseParts<T extends number[]>(value: string, count: T['length']): T {
  const parts: number[] = value.split('-').map(Number);
  if (parts.length !== count || parts.some((part: number): boolean => Number.isNaN(part))) {
    throw new Error(`Expected ${count} dash-separated numbers, got "${value}".`);
  }
  return parts as T;
}

/** Date → "2026-10-03" (local calendar day, not UTC). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2026-10-03" → Date at local midnight. */
export function fromIsoDate(iso: string): Date {
  const [
    year,
    month,
    day,
  ]: [number, number, number,
  ] = parseParts<[number, number, number]>(iso, 3);
  return new Date(
    year,
    month - 1,
    day,
  );
}

/** Date → "2026-10" */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** "2026-10" → October 1st 2026 at local midnight. */
export function fromMonthKey(month: string): Date {
  const [
    year, monthNumber,
  ]: [number, number,
  ] = parseParts<[number, number]>(month, 2);
  return new Date(
    year,
    monthNumber - 1,
    1,
  );
}

/** The 1st of the month `months` after `date`'s. */
export function addMonths(date: Date, months: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + months,
    1,
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
  );
}

/** 630 → "10:30 AM"; with `compact`, whole hours drop the minutes: 600 → "10 AM". */
export function formatMinutes(minutes: number, compact: boolean = false): string {
  const hours: number = Math.floor(minutes / 60);
  const remainder: number = minutes % 60;
  const hours12: number = ((hours + 11) % 12) + 1;
  const suffix: string = hours < 12 ? 'AM' : 'PM';
  return compact && remainder === 0 ? `${hours12} ${suffix}` : `${hours12}:${pad(remainder)} ${suffix}`;
}

/** "10:30:00" or "10:30" → 630 */
export function fromTimeOfDay(time: string): number {
  const [hours, minutes]: number[] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Expected "HH:mm" or "HH:mm:ss", got "${time}".`);
  }
  return hours * 60 + minutes;
}

type PartReader = (type: Intl.DateTimeFormatPartTypes) => string;

/** Building an `Intl.DateTimeFormat` is slow, and a booking page formats dozens of times, so each is built once. */
const formatsByZoneAndOptions: Map<string, Intl.DateTimeFormat> = new Map<string, Intl.DateTimeFormat>();

function readPartsIn(
  timeZone: string,
  instant: Date,
  options: Intl.DateTimeFormatOptions,
): PartReader {
  const cacheKey: string = `${timeZone}|${JSON.stringify(options)}`;
  let dateFormat: Intl.DateTimeFormat | undefined = formatsByZoneAndOptions.get(cacheKey);
  if (!dateFormat) {
    dateFormat = new Intl.DateTimeFormat(DATE_LOCALE, { ...options, timeZone });
    formatsByZoneAndOptions.set(cacheKey, dateFormat);
  }
  const parts: Intl.DateTimeFormatPart[] = dateFormat.formatToParts(instant);
  return (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((entry: Intl.DateTimeFormatPart): boolean => entry.type === type)?.value ?? '';
}

/** The weekday and time at `instant` on the clocks in `timeZone` (IANA), whatever the browser's timezone. */
export function weekTimeIn(timeZone: string, instant: Date): WeekTime {
  const part: PartReader = readPartsIn(
    timeZone,
    instant,
    {
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    },
  );
  return {
    // DATE_LOCALE's short weekday names are the same as WEEKDAY_SHORT_NAMES ('Sun' … 'Sat').
    day: WEEK_FROM_SUNDAY.find((day: Weekday): boolean => WEEKDAY_SHORT_NAMES[day] === part('weekday')) ?? Weekday.Sunday,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/** The calendar day ("2026-10-03") at `instant` on the clocks in `timeZone` (IANA), whatever the browser's timezone. */
export function toIsoDateIn(timeZone: string, instant: Date): string {
  const part: PartReader = readPartsIn(
    timeZone,
    instant,
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Today ("2026-10-03") on the clocks in `timeZone`, or on the browser's while the timezone is unknown (`null`). */
export function currentDateForTimeZone(timeZone: string | null, now: Date = new Date()): string {
  if (timeZone === null) {
    return toIsoDate(now);
  }
  return toIsoDateIn(timeZone, now);
}

/** Date → "Saturday, October 3" */
export function formatLongDate(date: Date): string {
  return formatDate(
    date,
    'EEEE, MMMM d',
    DATE_LOCALE,
  );
}

/** Date → "Saturday, October 3rd 2026". `formatDate` has no ordinals, so the suffix is added here. */
export function formatFullDate(date: Date): string {
  const day: number = date.getDate();
  return `${formatDate(
    date,
    'EEEE, MMMM',
    DATE_LOCALE,
  )} ${day}${toOrdinalSuffix(day)} ${date.getFullYear()}`;
}

/** 1 → "st", 2 → "nd", 3 → "rd", 11–13 → "th", 21 → "st", … */
function toOrdinalSuffix(day: number): string {
  const isTeen: boolean = day % 100 >= 11 && day % 100 <= 13;
  if (isTeen) {
    return 'th';
  }
  return ORDINAL_SUFFIXES[day % 10] ?? 'th';
}

/** Date → "Oct 26" */
export function formatMonthDay(date: Date): string {
  return formatDate(
    date,
    'MMM d',
    DATE_LOCALE,
  );
}

/** Date → "Nov" */
export function formatShortMonth(date: Date): string {
  return formatDate(
    date,
    'MMM',
    DATE_LOCALE,
  );
}

/** Date → "November 2026" */
export function formatMonthYear(date: Date): string {
  return formatDate(
    date,
    'MMMM yyyy',
    DATE_LOCALE,
  );
}

/** Date → "Sat, Oct 3" */
export function formatShortDate(date: Date): string {
  return formatDate(
    date,
    'EEE, MMM d',
    DATE_LOCALE,
  );
}
