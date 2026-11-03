import { MAX_DAYS_PER_AVAILABILITY_REQUEST } from '../../../core/config/booking-dates';
import { BookingSettings } from '../../shop/models/booking-settings.model';
import {
  addDays,
  formatLongDate,
  formatMinutes,
  fromIsoDate,
  toIsoDate,
  toIsoDateIn,
  toMonthKey,
  weekTimeIn,
} from '../../../shared/utils/date.utils';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityViewKind } from '../models/availability-view-kind.model';
import { AvailabilityView } from '../models/availability-view.model';
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

/** `MAX_DAYS_PER_AVAILABILITY_REQUEST` days from `firstDay`, cut to the booking window's last day. */
export function toUpcomingView(firstDay: Date, bookingWindow: DateRange): AvailabilityView {
  const maxRequestDate: Date = addDays(firstDay, MAX_DAYS_PER_AVAILABILITY_REQUEST - 1);
  return {
    kind: AvailabilityViewKind.Upcoming,
    firstDay: toIsoDate(firstDay),
    lastDay: toIsoDate(bookingWindow.max < maxRequestDate ? bookingWindow.max : maxRequestDate),
  };
}

/** Every month ("2026-11") after the booking window's first, through the one its last day falls in. */
export function toLaterMonths(bookingWindow: DateRange): string[] {
  const months: string[] = [];
  const month: Date = new Date(
    bookingWindow.min.getFullYear(),
    bookingWindow.min.getMonth() + 1,
    1,
  );
  while (month <= bookingWindow.max) {
    months.push(toMonthKey(month));
    month.setMonth(month.getMonth() + 1);
  }
  return months;
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
