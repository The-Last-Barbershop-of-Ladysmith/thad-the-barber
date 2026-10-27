import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InputSignal,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { RequestStatus } from '../../../../shared/models/request.models';
import { FILLING_UP_BELOW, UPCOMING_DAY_COUNT } from '../../../../core/config/booking-dates';
import {
  formatFullDate,
  formatMonthDay,
  formatMonthYear,
  formatShortMonth,
  fromIsoDate,
  fromMonthKey,
} from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { BookingNotice } from '../../models/booking-notice.model';
import { DateRange } from '../../models/date-range.model';
import { DayRange } from '../../models/day-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { NO_OPEN_DAYS_NOTICE } from '../../utils/booking-notice.utils';
import { toBookingWindow, toDayRange, toLaterMonths } from '../../utils/booking-time.utils';
import { NoticeMessage } from '../notice-message/notice-message';

/** An open day in the date step's list: the shop-calendar day ("2026-10-27") and how it reads. */
interface DateOption {
  date: string;
  label: string;
  /** The label plus the open count, so a screen reader hears "only 3 left" too. */
  accessibleLabel: string;
  openCount: number;
  isFillingUp: boolean;
}

/** A month the date step's month picker offers ("2026-11"). */
interface MonthOption {
  month: string;
  shortLabel: string;
  longLabel: string;
}

/** The month picker's months, one group per year. */
interface MonthOptionGroup {
  year: number;
  monthOptions: MonthOption[];
}

/**
 * Step 1: the open days of the view, written in full on the shop's clock. The view is the next 31 days (`null`) or a
 * later month the customer jumps to with the month picker or steps to with the arrows (#205).
 */
@Component({
  selector: 'app-date-step',
  imports: [
    ButtonModule,
    NoticeMessage,
    ReactiveFormsModule,
    SelectButtonModule,
    SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-step.html',
  styleUrl: './date-step.scss',
})
export class DateStep {
  readonly dateControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();
  readonly startAtControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();

  protected readonly upcomingLabel: string = `Next ${UPCOMING_DAY_COUNT} days`;
  protected readonly noOpenDaysNotice: BookingNotice = NO_OPEN_DAYS_NOTICE;
  /** Placeholder rows in the list's place while the days load. */
  protected readonly skeletonRows: number[] = Array.from({ length: 10 }, (_: unknown, index: number): number => index);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly availableDays: Signal<AvailableDay[]> = this.store.selectSignal(bookingFeature.selectAvailableDays);
  private readonly loadStatus: Signal<RequestStatus> = this.store.selectSignal(bookingFeature.selectLoadStatus);
  protected readonly visibleMonth: Signal<string | null> = this.store.selectSignal(bookingFeature.selectVisibleMonth);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLoading);

  protected readonly isMonthPickerOpen: WritableSignal<boolean> = signal(false);
  private readonly monthPickerToggle: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('monthPickerToggle');

  private readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  private readonly laterMonths: Signal<string[]> = computed((): string[] => {
    const bookingWindow: DateRange | null = this.bookingWindow();
    return bookingWindow ? toLaterMonths(bookingWindow) : [];
  });

  /** The arrows' order: the next 31 days, then each later month. */
  private readonly views: Signal<(string | null)[]> = computed((): (string | null)[] => [null, ...this.laterMonths()]);
  private readonly viewIndex: Signal<number> = computed((): number => this.views().indexOf(this.visibleMonth()));
  protected readonly isFirstView: Signal<boolean> = computed((): boolean => this.viewIndex() <= 0);
  protected readonly isLastView: Signal<boolean> = computed((): boolean => this.viewIndex() >= this.views().length - 1);

  protected readonly monthOptionGroups: Signal<MonthOptionGroup[]> = computed((): MonthOptionGroup[] =>
    toMonthOptionGroups(this.laterMonths()));

  protected readonly viewTitle: Signal<string> = computed((): string => {
    const visibleMonth: string | null = this.visibleMonth();
    return visibleMonth ? formatMonthYear(fromMonthKey(visibleMonth)) : this.upcomingLabel;
  });

  protected readonly rangeCaption: Signal<string> = computed((): string => {
    const visibleMonth: string | null = this.visibleMonth();
    const openDayCount: string = `${this.availableDays().length} open days`;
    if (visibleMonth) {
      return `Showing all of ${this.viewTitle()} · ${openDayCount}`;
    }
    const { firstDay, lastDay }: DayRange = toDayRange(null, this.timeZone());
    const windowEnd: Date | undefined = this.bookingWindow()?.max;
    const shownLastDay: Date = windowEnd && windowEnd < fromIsoDate(lastDay) ? windowEnd : fromIsoDate(lastDay);
    return `Showing ${formatMonthDay(fromIsoDate(firstDay))} – ${formatMonthDay(shownLastDay)} · ${openDayCount}`;
  });

  protected readonly dateOptions: Signal<DateOption[]> = computed((): DateOption[] =>
    this.availableDays().map(toDateOption));

  protected readonly hasNoOpenDays: Signal<boolean> = computed((): boolean =>
    this.loadStatus() === RequestStatus.Success && this.availableDays().length === 0);

  protected toggleMonthPicker(): void {
    this.isMonthPickerOpen.update((isOpen: boolean): boolean => !isOpen);
  }

  /** Escape closes the picker and puts focus back on its button. */
  protected closeMonthPicker(): void {
    this.isMonthPickerOpen.set(false);
    this.monthPickerToggle()?.nativeElement.focus();
  }

  /**
   * The days of another view don't include the picked day, so the pick and its time are cleared; otherwise the time
   * step would show a day with no times.
   */
  protected showView(month: string | null): void {
    this.isMonthPickerOpen.set(false);
    this.dateControl().reset();
    this.startAtControl().reset();
    this.store.dispatch(BookingActions.SetActiveMonthView({ month }));
  }

  protected showPrevious(): void {
    this.showView(this.views()[this.viewIndex() - 1] ?? null);
  }

  protected showNext(): void {
    const nextMonth: string | null | undefined = this.views()[this.viewIndex() + 1];
    if (nextMonth !== undefined) {
      this.showView(nextMonth);
    }
  }

  protected onDateChange(): void {
    this.startAtControl().reset();
  }
}

function toMonthOptionGroups(months: string[]): MonthOptionGroup[] {
  const groups: MonthOptionGroup[] = [];
  for (const month of months) {
    const firstDay: Date = fromMonthKey(month);
    const monthOption: MonthOption = {
      month,
      shortLabel: formatShortMonth(firstDay),
      longLabel: formatMonthYear(firstDay),
    };
    const yearGroup: MonthOptionGroup | undefined = groups.find((group: MonthOptionGroup): boolean =>
      group.year === firstDay.getFullYear());
    if (yearGroup) {
      yearGroup.monthOptions.push(monthOption);
    } else {
      groups.push({ year: firstDay.getFullYear(), monthOptions: [monthOption] });
    }
  }
  return groups;
}

function toDateOption(availableDay: AvailableDay): DateOption {
  const label: string = formatFullDate(fromIsoDate(availableDay.date));
  const openCount: number = availableDay.times.length;
  const isFillingUp: boolean = openCount < FILLING_UP_BELOW;
  return {
    date: availableDay.date,
    label,
    accessibleLabel: isFillingUp ? `${label}, only ${openCount} left` : `${label}, ${openCount} open`,
    openCount,
    isFillingUp,
  };
}
