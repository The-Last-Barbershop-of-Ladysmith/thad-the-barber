import { UPCOMING_DAY_COUNT } from '../../../core/config/booking-dates';
import { BookingSettings } from '../../shop/models/booking-settings.model';
import {
  addDays,
  formatLongDate,
  formatMinutes,
  fromIsoDate,
  fromMonthKey,
  toIsoDate,
  toIsoDateIn,
  toMonthKey,
  weekTimeIn,
} from '../../../shared/utils/date.utils';
import { AvailableDay } from '../dtos/available-day.dto';
import { DateRange } from '../models/date-range.model';
import { DayRange } from '../models/day-range.model';
import { TimeSlot } from '../models/time-slot.model';

/** From today on the shop's clock to the furthest day Square lets customers book. */
export function toBookingWindow(
  bookingSettings: BookingSettings | null,
  timeZone: string | null,
  now: Date = new Date(),
): DateRange | null {
  if (!bookingSettings || !timeZone) {
    return null;
  }
  const min: Date = fromIsoDate(toIsoDateIn(timeZone, now));
  return { min, max: addDays(min, bookingSettings.maxAdvanceDays) };
}

/**
 * The days a view asks for: a month's 1st through its last day, or with no month (`null`) today on the shop's clock
 * through the next `UPCOMING_DAY_COUNT` days (the browser's clock until the shop loads). The API cuts either to the
 * booking window.
 */
export function toDayRange(
  month: string | null,
  timeZone: string | null,
  now: Date = new Date(),
): DayRange {
  if (month === null) {
    const today: Date = timeZone ? fromIsoDate(toIsoDateIn(timeZone, now)) : now;
    return { firstDay: toIsoDate(today), lastDay: toIsoDate(addDays(today, UPCOMING_DAY_COUNT - 1)) };
  }
  const firstDay: Date = fromMonthKey(month);
  const lastDay: Date = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth() + 1,
    0,
  );
  return { firstDay: toIsoDate(firstDay), lastDay: toIsoDate(lastDay) };
}

/** Every month ("2026-11") after the booking window's first, through the one its last day falls in. */
export function toLaterMonths(bookingWindow: DateRange): string[] {
  const lastMonth: string = toMonthKey(bookingWindow.max);
  const months: string[] = [];
  for (
    let month: Date = new Date(
      bookingWindow.min.getFullYear(),
      bookingWindow.min.getMonth() + 1,
      1,
    );
    toMonthKey(month) <= lastMonth;
    month = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      1,
    )
  ) {
    months.push(toMonthKey(month));
  }
  return months;
}

/** The picked day's open times, while its month is the one in view, labelled on the shop's clock. */
export function toTimeSlots(
  availableDays: AvailableDay[],
  date: string | null,
  timeZone: string | null,
): TimeSlot[] {
  if (!timeZone) {
    return [];
  }
  const times: string[] = availableDays.find((day: AvailableDay): boolean => day.date === date)?.times ?? [];
  return times.map((startAt: string): TimeSlot => ({ startAt, label: toTimeLabel(timeZone, startAt) }));
}

/** "2026-10-03T20:30:00Z" → "10:30 AM" on the shop's clock. */
export function toTimeLabel(timeZone: string, startAt: string): string {
  return formatMinutes(weekTimeIn(timeZone, new Date(startAt)).minutes);
}

/** "2026-10-03T20:30:00Z" → "Saturday, October 3 at 10:30 AM" on the shop's clock. */
export function toLongDateTime(timeZone: string, startAt: string): string {
  const date: string = formatLongDate(fromIsoDate(toIsoDateIn(timeZone, new Date(startAt))));
  return `${date} at ${toTimeLabel(timeZone, startAt)}`;
}
