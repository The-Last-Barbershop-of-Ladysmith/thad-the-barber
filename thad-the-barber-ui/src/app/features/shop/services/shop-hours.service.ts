import { DestroyRef, Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { HoursRow } from '../models/hours-row.model';
import { OpenStatus } from '../models/open-status.model';
import { ShopOpeningHours } from '../models/shop-opening-hours.model';
import { WeekTime } from '../../../shared/models/week-time.model';
import { Weekday } from '../../../shared/models/weekday.model';
import { formatMinutes, fromTimeOfDay, weekTimeIn } from '../../../shared/utils/date.utils';
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  WEEK_FROM_MONDAY,
  toDayRuns,
  toWeekday,
  weekdaySpanLabel,
} from '../../../shared/utils/weekday.utils';
import { AppState } from '../../../store/app.state';
import { shopFeature } from '../state/shop.feature';

/**
 * Opening hours and the live "Open now" status, from the `shop` slice. Both are empty until the shop loads. The
 * status reads the shop's clock, not the visitor's, so it's right from any timezone.
 */
@Injectable({ providedIn: 'root' })
export class ShopHoursService {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly hours: Signal<ShopOpeningHours[]> = this.store.selectSignal(shopFeature.selectOpeningHours);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly now: WritableSignal<Date> = signal(new Date());

  /**
   * One row per open day, Monday first (so the weekend reads Sat, Sun), then one "closed" row for each run of
   * closed days.
   */
  readonly businessHours: Signal<HoursRow[]> = computed(
    (): HoursRow[] => this.generateOperatingHoursRows(this.hours()),
  );

  private readonly today: Signal<Weekday | null> = computed((): Weekday | null => {
    const timeZone: string | null = this.timeZone();
    if (timeZone === null) {
      return null;
    }
    return weekTimeIn(timeZone, this.now()).day;
  });

  /** One row for each weekday, Monday first, closed days included, with the shop's current day marked. */
  readonly weekHours: Signal<HoursRow[]> = computed((): HoursRow[] => {
    if (this.hours().length === 0) {
      return [];
    }
    const today: Weekday | null = this.today();
    return WEEK_FROM_MONDAY.map((day: Weekday): HoursRow => ({ ...this.toDayRow(day), isToday: day === today }));
  });

  readonly currentOpenStatus: Signal<OpenStatus | null> = computed((): OpenStatus | null => {
    const timeZone: string | null = this.timeZone();
    if (timeZone === null) {
      return null;
    }
    return this.getShopCurrentStatus(weekTimeIn(timeZone, this.now()));
  });

  constructor() {
    const timer: ReturnType<typeof setInterval> = setInterval(
      (): void => {
        this.now.set(new Date());
      },
      60_000,
    );
    inject(DestroyRef).onDestroy((): void => {
      clearInterval(timer);
    });
  }

  isOpenDay(day: Weekday): boolean {
    return this.fetchShopHoursForDay(day).length > 0;
  }

  getShopCurrentStatus({ day, minutes }: WeekTime): OpenStatus {
    const today: ShopOpeningHours[] = this.fetchShopHoursForDay(day);
    const isOpenNow: boolean = today.some((period: ShopOpeningHours): boolean =>
      minutes >= fromTimeOfDay(period.opens) && minutes < fromTimeOfDay(period.closes));
    if (isOpenNow) {
      return { isOpen: true, label: 'Open now' };
    }
    const laterToday: ShopOpeningHours | undefined = today.find((period: ShopOpeningHours): boolean =>
      minutes < fromTimeOfDay(period.opens));
    if (laterToday) {
      return { isOpen: false, label: `Opens today at ${formatMinutes(fromTimeOfDay(laterToday.opens), true)}` };
    }
    for (let offset: number = 1; offset <= 7; offset++) {
      const nextDay: Weekday = toWeekday(day + offset);
      const next: ShopOpeningHours | undefined = this.fetchShopHoursForDay(nextDay)[0];
      if (next) {
        return {
          isOpen: false,
          label: `Closed · Opens ${WEEKDAY_SHORT_NAMES[nextDay]} ${formatMinutes(fromTimeOfDay(next.opens), true)}`,
        };
      }
    }
    return { isOpen: false, label: 'Closed' };
  }

  private fetchShopHoursForDay(day: Weekday): ShopOpeningHours[] {
    return this.hours()
      .filter((period: ShopOpeningHours): boolean => period.day === day)
      .sort((a: ShopOpeningHours, b: ShopOpeningHours): number => fromTimeOfDay(a.opens) - fromTimeOfDay(b.opens));
  }

  private toDayRow(day: Weekday): HoursRow {
    const periods: ShopOpeningHours[] = this.fetchShopHoursForDay(day);
    return {
      label: WEEKDAY_NAMES[day],
      shortLabel: WEEKDAY_SHORT_NAMES[day],
      range: periods.map((period: ShopOpeningHours): string => toRange(period, false)).join(', '),
      shortRange: periods.map((period: ShopOpeningHours): string => toRange(period, true)).join(', '),
      isClosed: periods.length === 0,
      isToday: false,
    };
  }

  private generateOperatingHoursRows(hours: ShopOpeningHours[]): HoursRow[] {
    if (hours.length === 0) {
      return [];
    }

    const operatingHours: HoursRow[] = WEEK_FROM_MONDAY
      .filter((day: Weekday): boolean => this.isOpenDay(day))
      .map((day: Weekday): HoursRow => this.toDayRow(day));

    const closedRows: HoursRow[] = toDayRuns(WEEK_FROM_MONDAY.filter((day: Weekday): boolean => !this.isOpenDay(day)))
      .map((run: Weekday[]): HoursRow => {
        const first: Weekday = run[0] ?? Weekday.Monday;
        const last: Weekday = run[run.length - 1] ?? first;
        return {
          label: weekdaySpanLabel(
            first,
            last,
            WEEKDAY_NAMES,
          ),
          shortLabel: weekdaySpanLabel(
            first,
            last,
            WEEKDAY_SHORT_NAMES,
          ),
          range: '',
          shortRange: '',
          isClosed: true,
          isToday: false,
        };
      });

    return [...operatingHours, ...closedRows];
  }
}

/** "10:00 AM – 7:30 PM", or with `compact` "10 AM – 7:30 PM". */
function toRange(period: ShopOpeningHours, compact: boolean): string {
  return `${formatMinutes(fromTimeOfDay(period.opens), compact)} – ${formatMinutes(fromTimeOfDay(period.closes), compact)}`;
}
