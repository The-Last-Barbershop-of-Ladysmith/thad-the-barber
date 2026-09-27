import { Injectable, inject } from '@angular/core';
import { type Observable, delay, of } from 'rxjs';
import { type OpeningHours } from '../../../core/models/shop.models';
import { ShopHoursService } from '../../../core/services/shop-hours.service';
import {
  addDays,
  formatMinutes,
  fromIsoDate,
  fromMonthKey,
  startOfToday,
  toIsoDate,
  toTimeKey,
} from '../../../shared/utils/date.utils';
import { hashToUnit } from '../../../shared/utils/math.utils';
import { type BookingRules, type DateRange, type TimeSlot } from '../models/booking.models';

export const BOOKING_RULES: BookingRules = {
  daysAhead: 60,
  slotMinutes: 30,
};

/**
 * Open dates and time slots.
 * Mocked with a deterministic pseudo-random "already booked" pattern, like the wireframe,
 * until the calendar backend exists. Keep the method signatures when swapping in HttpClient.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly hours: ShopHoursService = inject(ShopHoursService);

  bookingWindow(now: Date = new Date()): DateRange {
    const min: Date = startOfToday(now);
    return {
      min,
      max: addDays(
        min,
        BOOKING_RULES.daysAhead,
      ),
    };
  }

  /** ISO dates in the month ("2026-10") that can't be booked: past, closed, beyond the window, or full. */
  getUnavailableDates(month: string): Observable<string[]> {
    const first: Date = fromMonthKey(month);
    const unavailable: string[] = [];
    for (
      let date: Date = first;
      date.getMonth() === first.getMonth();
      date = addDays(
        date,
        1,
      )
    ) {
      if (!this.isBookable(date)) {
        unavailable.push(toIsoDate(date));
      }
    }
    return of(unavailable).pipe(delay(150));
  }

  getSlots(isoDate: string): Observable<TimeSlot[]> {
    return of(this.slotsFor(fromIsoDate(isoDate))).pipe(delay(150));
  }

  private isBookable(date: Date): boolean {
    const window: DateRange = this.bookingWindow();
    if (date < window.min || date > window.max) {
      return false;
    }
    if (!this.hours.hoursFor(date)) {
      return false;
    }
    // Mock: the shop is closed for the day.
    if (hashToUnit(toIsoDate(date)) < 0.12) {
      return false;
    }
    return this.slotsFor(date).some((slot: TimeSlot): boolean => slot.available);
  }

  private slotsFor(date: Date): TimeSlot[] {
    const hours: OpeningHours | undefined = this.hours.hoursFor(date);
    if (!hours) {
      return [];
    }

    const now: Date = new Date();
    const iso: string = toIsoDate(date);
    const isToday: boolean = iso === toIsoDate(now);
    const nowMinutes: number = now.getHours() * 60 + now.getMinutes();
    const slots: TimeSlot[] = [];

    for (
      let start: number = hours.opensAt;
      start + BOOKING_RULES.slotMinutes <= hours.closesAt;
      start += BOOKING_RULES.slotMinutes
    ) {
      const taken: boolean = (isToday && start <= nowMinutes) || hashToUnit(`${iso}@${start}`) < 0.35;
      slots.push({
        time: toTimeKey(start),
        label: formatMinutes(start),
        available: !taken,
      });
    }
    return slots;
  }
}
