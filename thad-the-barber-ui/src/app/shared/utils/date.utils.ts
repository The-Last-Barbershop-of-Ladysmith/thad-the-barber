import { formatDate } from '@angular/common';

/** Local-time date helpers. The store keeps dates as ISO strings so state stays serializable. */

/** Locale for display labels. They use `formatDate`, the same formatter behind Angular's `DatePipe`. */
const DATE_LOCALE: string = 'en-US';

function pad(value: number): string {
  return String(value).padStart(
    2,
    '0',
  );
}

/** "2026-10-03" → [2026, 10, 3]. Throws on anything that isn't `count` dash-separated numbers. */
function parseParts<T extends number[]>(
  value: string,
  count: T['length'],
): T {
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
  ] = parseParts<[number, number, number]>(
    iso,
    3,
  );
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
    year,
    monthNumber,
  ]: [number, number,
  ] = parseParts<[number, number]>(
    month,
    2,
  );
  return new Date(
    year,
    monthNumber - 1,
    1,
  );
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

export function addDays(
  date: Date,
  days: number,
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
  );
}

/** 630 → "10:30 AM"; with `compact`, whole hours drop the minutes: 600 → "10 AM". */
export function formatMinutes(
  minutes: number,
  compact: boolean = false,
): string {
  const hours: number = Math.floor(minutes / 60);
  const remainder: number = minutes % 60;
  const hours12: number = ((hours + 11) % 12) + 1;
  const suffix: string = hours < 12 ? 'AM' : 'PM';
  return compact && remainder === 0 ? `${hours12} ${suffix}` : `${hours12}:${pad(remainder)} ${suffix}`;
}

/** 630 → "10:30" (24h key used for slot values) */
export function toTimeKey(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Date → "Saturday, October 3" */
export function formatLongDate(date: Date): string {
  return formatDate(
    date,
    'EEEE, MMMM d',
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
