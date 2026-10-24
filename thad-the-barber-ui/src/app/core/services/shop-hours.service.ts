import {
  DestroyRef,
  Injectable,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HoursRow } from '../models/shop/hours-row.model';
import { OpenStatus } from '../models/shop/open-status.model';
import { ShopOpeningHours } from '../models/shop/shop-opening-hours.model';
import { WeekTime } from '../models/shop/week-time.model';
import { Weekday } from '../models/shop/weekday.model';
import {
  formatMinutes,
  fromTimeOfDay,
  weekTimeIn,
} from '../../shared/utils/date.utils';
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  WEEK_FROM_MONDAY,
  toWeekday,
  weekdaySpanLabel,
} from '../../shared/utils/weekday.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../store/shop/shop.feature';

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

  /** Open days in display order (Sat, Sun) followed by one "closed" row for the rest. */
  readonly businessHours: Signal<HoursRow[]> = computed(
    (): HoursRow[] => this.generateOperatingHoursRows(this.hours()),
  );

  readonly currentOpenStatus: Signal<OpenStatus | null> = computed((): OpenStatus | null => {
    const timeZone: string | null = this.timeZone();
    if (timeZone === null) {
      return null;
    }
    return this.getShopCurrentStatus(weekTimeIn(timeZone, this.now()));
  });

  /** Weekdays with no hours, e.g. [1, 2, 3, 4, 5]. Feeds the date picker's disabledDays. */
  readonly closedWeekdays: Signal<Weekday[]> = computed((): Weekday[] => WEEK_FROM_MONDAY
    .filter((day: Weekday): boolean => !this.isOpenDay(day))
    .sort((a: Weekday, b: Weekday): number => a - b));

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

  getShopHoursForDate(date: Date): ShopOpeningHours | undefined {
    return this.fetchShopHoursForDay(toWeekday(date.getDay()));
  }

  isOpenDay(day: Weekday): boolean {
    return this.fetchShopHoursForDay(day) !== undefined;
  }

  getShopCurrentStatus({ day, minutes }: WeekTime): OpenStatus {
    const today: ShopOpeningHours | undefined = this.fetchShopHoursForDay(day);
    if (today) {
      const opensAt: number = fromTimeOfDay(today.opens);
      const isOpenNow: boolean = minutes >= opensAt && minutes < fromTimeOfDay(today.closes);
      const opensLaterToday: boolean = minutes < opensAt;
      if (isOpenNow) {
        return { isOpen: true, label: 'Open now' };
      }
      if (opensLaterToday) {
        return { isOpen: false, label: `Opens today at ${formatMinutes(opensAt, true)}` };
      }
    }
    for (let offset: number = 1; offset <= 7; offset++) {
      const nextDay: Weekday = toWeekday(day + offset);
      const next: ShopOpeningHours | undefined = this.fetchShopHoursForDay(nextDay);
      if (next) {
        return {
          isOpen: false,
          label: `Closed · Opens ${WEEKDAY_SHORT_NAMES[nextDay]} ${formatMinutes(fromTimeOfDay(next.opens), true)}`,
        };
      }
    }
    return { isOpen: false, label: 'Closed' };
  }

  private fetchShopHoursForDay(day: Weekday): ShopOpeningHours | undefined {
    return this.hours().find((entry: ShopOpeningHours): boolean => entry.day === day);
  }

  /* Creates the rows for displaying opening hours */
  private generateOperatingHoursRows(hours: ShopOpeningHours[]): HoursRow[] {
    if (hours.length === 0) {
      return [];
    }

    const operatingHours: HoursRow[] = hours.map((entry: ShopOpeningHours): HoursRow => {
      const opensAt: number = fromTimeOfDay(entry.opens);
      const closesAt: number = fromTimeOfDay(entry.closes);
      return {
        label: WEEKDAY_NAMES[entry.day],
        shortLabel: WEEKDAY_SHORT_NAMES[entry.day],
        range: `${formatMinutes(opensAt)} – ${formatMinutes(closesAt)}`,
        shortRange: `${formatMinutes(opensAt, true)} – ${formatMinutes(closesAt, true)}`,
        closed: false,
      };
    });

    const closedDays: Weekday[] = WEEK_FROM_MONDAY.filter((day: Weekday): boolean => !this.isOpenDay(day));
    const first: Weekday | undefined = closedDays[0];
    const last: Weekday | undefined = closedDays[closedDays.length - 1];
    if (first === undefined || last === undefined) {
      return operatingHours;
    }

    return [
      ...operatingHours,
      {
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
        range: 'Closed',
        shortRange: 'Closed',
        closed: true,
      },
    ];
  }
}
