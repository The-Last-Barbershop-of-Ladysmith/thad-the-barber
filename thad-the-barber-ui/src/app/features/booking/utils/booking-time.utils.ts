import { BookingSettings } from '../../shop/models/booking-settings.model';
import {
  addDays,
  formatLongDate,
  formatMinutes,
  fromIsoDate,
  toIsoDate,
  toIsoDateIn,
  weekTimeIn,
} from '../../../shared/utils/date.utils';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';
import { DateRange } from '../models/date-range.model';
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

/** A calendar month (`month` 1–12), 1st through last day: at most 31 days, as one availability request allows. */
export function toMonthRange(year: number, month: number): DayRange {
  return {
    firstDay: toIsoDate(new Date(
      year,
      month - 1,
      1,
    )),
    lastDay: toIsoDate(new Date(
      year,
      month,
      0,
    )),
  };
}

/** The picked day's open times, from the days in view, labelled on the shop's clock. */
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
