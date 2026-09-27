import { DestroyRef, Injectable, type Signal, type WritableSignal, computed, inject, signal } from '@angular/core';
import { OPENING_HOURS } from '../config/shop-info';
import { type HoursRow, type OpenStatus, type OpeningHours, type Weekday } from '../models/shop.models';
import { formatMinutes } from '../../shared/utils/date.utils';

const DAY_NAMES: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const DAY_SHORT: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/** Monday-first order, so a run of closed weekdays reads "Monday – Friday". */
const WEEK_FROM_MONDAY: readonly Weekday[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  0,
];

function toWeekday(day: number): Weekday {
  return (((day % 7) + 7) % 7) as Weekday;
}

/** "Monday – Friday", or just "Monday" for a single day. */
function spanLabel(
  first: Weekday,
  last: Weekday,
  names: Record<Weekday, string>,
): string {
  return first === last ? names[first] : `${names[first]} – ${names[last]}`;
}

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
      .sort((
        a: Weekday,
        b: Weekday,
      ): number => a - b);
  }

  statusAt(now: Date): OpenStatus {
    const minutes: number = now.getHours() * 60 + now.getMinutes();
    const today: OpeningHours | undefined = this.hoursFor(now);

    if (today && minutes >= today.opensAt && minutes < today.closesAt) {
      return {
        isOpen: true,
        label: 'Open now',
      };
    }
    if (today && minutes < today.opensAt) {
      return {
        isOpen: false,
        label: `Opens today at ${formatMinutes(
          today.opensAt,
          true,
        )}`,
      };
    }
    for (let offset: number = 1; offset <= 7; offset++) {
      const day: Weekday = toWeekday(now.getDay() + offset);
      const next: OpeningHours | undefined = this.hours.find((entry: OpeningHours): boolean => entry.day === day);
      if (next) {
        return {
          isOpen: false,
          label: `Closed · Opens ${DAY_SHORT[day]} ${formatMinutes(
            next.opensAt,
            true,
          )}`,
        };
      }
    }
    return {
      isOpen: false,
      label: 'Closed',
    };
  }

  private buildRows(): HoursRow[] {
    const open: HoursRow[] = this.hours.map((entry: OpeningHours): HoursRow => ({
      label: DAY_NAMES[entry.day],
      shortLabel: DAY_SHORT[entry.day],
      range: `${formatMinutes(entry.opensAt)} – ${formatMinutes(entry.closesAt)}`,
      shortRange: `${formatMinutes(
        entry.opensAt,
        true,
      )} – ${formatMinutes(
        entry.closesAt,
        true,
      )}`,
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
        label: spanLabel(
          first,
          last,
          DAY_NAMES,
        ),
        shortLabel: spanLabel(
          first,
          last,
          DAY_SHORT,
        ),
        range: 'Closed',
        shortRange: 'Closed',
        closed: true,
      },
    ];
  }
}
