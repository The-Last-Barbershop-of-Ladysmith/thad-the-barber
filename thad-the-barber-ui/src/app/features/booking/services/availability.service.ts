import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  Observable,
  delay,
  filter,
  map,
  take,
} from 'rxjs';
import { ShopOpeningHours } from '../../../core/models/shop/shop-opening-hours.model';
import { ShopHoursService } from '../../../core/services/shop-hours.service';
import { AppState } from '../../../store/app.state';
import { shopFeature } from '../../../store/shop/shop.feature';
import {
  addDays,
  formatMinutes,
  fromIsoDate,
  fromMonthKey,
  fromTimeOfDay,
  startOfToday,
  toIsoDate,
  toTimeKey,
} from '../../../shared/utils/date.utils';
import { hashToUnit } from '../../../shared/utils/math.utils';
import {
  BookingRules,
  DateRange,
  TimeSlot,
} from '../models/booking.models';

export const BOOKING_RULES: BookingRules = { daysAhead: 60, slotMinutes: 30 };

/**
 * Open dates and time slots.
 * Mocked with a deterministic pseudo-random "already booked" pattern, like the wireframe,
 * until the calendar backend exists. Keep the method signatures when swapping in HttpClient.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly hours: ShopHoursService = inject(ShopHoursService);
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  bookingWindow(now: Date = new Date()): DateRange {
    const min: Date = startOfToday(now);
    return { min, max: addDays(min, BOOKING_RULES.daysAhead) };
  }

  /** ISO dates in the month ("2026-10") that can't be booked: past, closed, beyond the window, or full. */
  getUnavailableDates(month: string): Observable<string[]> {
    return this.afterHoursLoad((): string[] => {
      const first: Date = fromMonthKey(month);
      const unavailable: string[] = [];
      for (
        let date: Date = first;
        date.getMonth() === first.getMonth();
        date = addDays(date, 1)
      ) {
        if (!this.isBookable(date)) {
          unavailable.push(toIsoDate(date));
        }
      }
      return unavailable;
    });
  }

  getSlots(isoDate: string): Observable<TimeSlot[]> {
    return this.afterHoursLoad((): TimeSlot[] => this.slotsFor(fromIsoDate(isoDate)));
  }

  /** The mock derives everything from the opening hours, which arrive with the shop, maybe after /book opens. */
  private afterHoursLoad<T>(compute: () => T): Observable<T> {
    return this.store.select(shopFeature.selectOpeningHours).pipe(
      filter((hours: ShopOpeningHours[]): boolean => hours.length > 0),
      take(1),
      delay(150),
      map(compute),
    );
  }

  private isBookable(date: Date): boolean {
    const window: DateRange = this.bookingWindow();
    if (date < window.min || date > window.max) {
      return false;
    }
    if (!this.hours.getShopHoursForDate(date)) {
      return false;
    }
    // Mock: the shop is closed for the day.
    if (hashToUnit(toIsoDate(date)) < 0.12) {
      return false;
    }
    return this.slotsFor(date).some((slot: TimeSlot): boolean => slot.available);
  }

  private slotsFor(date: Date): TimeSlot[] {
    const hours: ShopOpeningHours | undefined = this.hours.getShopHoursForDate(date);
    if (!hours) {
      return [];
    }

    const now: Date = new Date();
    const iso: string = toIsoDate(date);
    const isToday: boolean = iso === toIsoDate(now);
    const nowMinutes: number = now.getHours() * 60 + now.getMinutes();
    const slots: TimeSlot[] = [];

    for (
      let start: number = fromTimeOfDay(hours.opens);
      start + BOOKING_RULES.slotMinutes <= fromTimeOfDay(hours.closes);
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
