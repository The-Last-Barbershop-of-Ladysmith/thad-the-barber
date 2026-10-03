import {
  DestroyRef,
  Injectable,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { OPENING_HOURS } from '../config/shop-info';
import {
  HoursRow,
  OpenStatus,
  OpeningHours,
  Weekday,
} from '../models/shop.models';
import { formatMinutes } from '../../shared/utils/date.utils';
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  WEEK_FROM_MONDAY,
  toWeekday,
  weekdaySpanLabel,
} from '../../shared/utils/weekday.utils';

/** Opening hours and the live "Open now" status shown in the schedule section. */
@Injectable({ providedIn: 'root' })
export class ShopHoursService {
  private readonly hours: readonly OpeningHours[] = OPENING_HOURS;
  private readonly now: WritableSignal<Date> = signal(new Date());

  /** Open days in display order (Sat, Sun) followed by one "closed" row for the rest. */
  readonly rows: HoursRow[] = this.buildRows();

  readonly status: Signal<OpenStatus> = computed((): OpenStatus => this.statusAt(this.now()));

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

  hoursFor(date: Date): OpeningHours | undefined {
    return this.hours.find((entry: OpeningHours): boolean => entry.day === date.getDay());
  }

  isOpenDay(day: Weekday): boolean {
    return this.hours.some((entry: OpeningHours): boolean => entry.day === day);
  }

  /** Weekdays with no hours, e.g. [1, 2, 3, 4, 5]. Feeds the date picker's disabledDays. */
  closedWeekdays(): Weekday[] {
    return WEEK_FROM_MONDAY
      .filter((day: Weekday): boolean => !this.isOpenDay(day))
      .sort((a: Weekday, b: Weekday): number => a - b);
  }

  statusAt(now: Date): OpenStatus {
    const minutes: number = now.getHours() * 60 + now.getMinutes();
    const today: OpeningHours | undefined = this.hoursFor(now);

    if (today && minutes >= today.opensAt && minutes < today.closesAt) {
      return { isOpen: true, label: 'Open now' };
    }
    if (today && minutes < today.opensAt) {
      return { isOpen: false, label: `Opens today at ${formatMinutes(today.opensAt, true)}` };
    }
    for (let offset: number = 1; offset <= 7; offset++) {
      const day: Weekday = toWeekday(now.getDay() + offset);
      const next: OpeningHours | undefined = this.hours.find((entry: OpeningHours): boolean => entry.day === day);
      if (next) {
        return {
          isOpen: false,
          label: `Closed · Opens ${WEEKDAY_SHORT_NAMES[day]} ${formatMinutes(next.opensAt, true)}`,
        };
      }
    }
    return { isOpen: false, label: 'Closed' };
  }

  private buildRows(): HoursRow[] {
    const open: HoursRow[] = this.hours.map((entry: OpeningHours): HoursRow => ({
      label: WEEKDAY_NAMES[entry.day],
      shortLabel: WEEKDAY_SHORT_NAMES[entry.day],
      range: `${formatMinutes(entry.opensAt)} – ${formatMinutes(entry.closesAt)}`,
      shortRange: `${formatMinutes(entry.opensAt, true)} – ${formatMinutes(entry.closesAt, true)}`,
      closed: false,
    }));

    const closedDays: Weekday[] = WEEK_FROM_MONDAY.filter((day: Weekday): boolean => !this.isOpenDay(day));
    const first: Weekday | undefined = closedDays[0];
    const last: Weekday | undefined = closedDays[closedDays.length - 1];
    if (first === undefined || last === undefined) {
      return open;
    }

    return [
      ...open,
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
