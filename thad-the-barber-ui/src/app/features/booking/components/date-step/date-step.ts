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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { RequestStatus } from '../../../../shared/models/request.models';
import { FILLING_UP_BELOW, UPCOMING_DAY_COUNT } from '../../../../core/config/booking-dates';
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthDay,
  formatMonthYear,
  formatShortMonth,
  fromIsoDate,
  fromMonthKey,
  toIsoDate,
  toMonthKey,
} from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { Notice } from '../../../../shared/models/notice.model';
import { AvailabilityViewKind } from '../../models/availability-view-kind.model';
import { AvailabilityView } from '../../models/availability-view.model';
import { DateRange } from '../../models/date-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { NO_OPEN_DAYS_NOTICE } from '../../utils/booking-notice.utils';
import {
  isSameView,
  toBookingWindow,
  toLaterMonths,
  toMonthView,
  toUpcomingView,
} from '../../utils/booking-time.utils';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';

/** The month picker's key for the 31-day blocks; a SelectButton can't select a null month. */
const UPCOMING_KEY: string = 'upcoming';

/** The month picker's "Next 31 days" choice. */
interface UpcomingOption {
  label: string;
  viewKey: string;
}

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
    FormsModule,
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
  protected readonly upcomingOptions: UpcomingOption[] = [{ label: this.upcomingLabel, viewKey: UPCOMING_KEY }];
  protected readonly noOpenDaysNotice: Notice = NO_OPEN_DAYS_NOTICE;
  /** Placeholder rows in the list's place while the days load. */
  protected readonly skeletonRows: number[] = Array<number>(10).fill(0);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly availableDays: Signal<AvailableDay[]> = this.store.selectSignal(bookingFeature.selectAvailableDays);
  private readonly loadStatus: Signal<RequestStatus> = this.store.selectSignal(bookingFeature.selectLoadStatus);
  private readonly availabilityView: Signal<AvailabilityView | null> =
    this.store.selectSignal(bookingFeature.selectAvailabilityView);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLoading);

  protected readonly isMonthPickerOpen: WritableSignal<boolean> = signal(false);
  private readonly monthPickerToggle: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('monthPickerToggle');

  /** The month picker's choice: the month in view, or the 31-day blocks whichever block is showing. */
  protected readonly viewKey: Signal<string> = computed((): string => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    return availabilityView?.kind === AvailabilityViewKind.Month ? availabilityView.firstDay.slice(0, 7) : UPCOMING_KEY;
  });

  private readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  private readonly laterMonths: Signal<string[]> = computed((): string[] => {
    const bookingWindow: DateRange | null = this.bookingWindow();
    return bookingWindow ? toLaterMonths(bookingWindow) : [];
  });

  /** On a 31-day block, back stops at today's; on a month, at the first month offered. */
  protected readonly isFirstView: Signal<boolean> = computed((): boolean => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (!availabilityView || !bookingWindow) {
      return true;
    }
    if (availabilityView.kind === AvailabilityViewKind.Upcoming) {
      return availabilityView.firstDay <= toIsoDate(bookingWindow.min);
    }
    return availabilityView.firstDay.slice(0, 7) <= (this.laterMonths()[0] ?? '');
  });

  /** On a 31-day block, next stops at the one the booking window ends in; on a month, at its last month. */
  protected readonly isLastView: Signal<boolean> = computed((): boolean => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (!availabilityView || !bookingWindow) {
      return true;
    }
    if (availabilityView.kind === AvailabilityViewKind.Upcoming) {
      return availabilityView.lastDay >= toIsoDate(bookingWindow.max);
    }
    return availabilityView.firstDay.slice(0, 7) >= (this.laterMonths().at(-1) ?? '');
  });

  protected readonly monthOptionGroups: Signal<MonthOptionGroup[]> = computed((): MonthOptionGroup[] =>
    toMonthOptionGroups(this.laterMonths()));

  /** "November 2026", "Next 31 days" for today's block, or a later block's days ("Nov 26 – Dec 26"). */
  protected readonly viewTitle: Signal<string> = computed((): string => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (availabilityView?.kind === AvailabilityViewKind.Month) {
      return formatMonthYear(fromIsoDate(availabilityView.firstDay));
    }
    if (!availabilityView || !bookingWindow || availabilityView.firstDay === toIsoDate(bookingWindow.min)) {
      return this.upcomingLabel;
    }
    return toShortRange(availabilityView);
  });

  protected readonly rangeCaption: Signal<string> = computed((): string => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (!availabilityView) {
      return '';
    }
    const dayCount: number = this.availableDays().length;
    const openDayCount: string = this.isLoading() ? '' : ` · ${dayCount} open ${dayCount === 1 ? 'day' : 'days'}`;
    const shownDays: string = availabilityView.kind === AvailabilityViewKind.Month ? `all of ${this.viewTitle()}` : toShortRange(availabilityView);
    return `Showing ${shownDays}${openDayCount}`;
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

  /** The month picker: a month, or the 31-day blocks from today's. */
  protected showViewKey(viewKey: string): void {
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (viewKey !== UPCOMING_KEY) {
      this.showView(toMonthView(viewKey));
    } else if (bookingWindow) {
      this.showView(toUpcomingView(bookingWindow.min, bookingWindow));
    }
  }

  /** The arrows, -1 back and 1 forward: a 31-day block moves 31 days, a month moves a month. */
  protected showAdjacentView(offset: number): void {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (!availabilityView || !bookingWindow) {
      return;
    }
    const firstDay: Date = fromIsoDate(availabilityView.firstDay);
    if (availabilityView.kind === AvailabilityViewKind.Upcoming) {
      this.showView(toUpcomingView(addDays(firstDay, offset * UPCOMING_DAY_COUNT), bookingWindow));
    } else {
      this.showView(toMonthView(toMonthKey(addMonths(firstDay, offset))));
    }
  }

  /**
   * The days of another view don't include the picked day, so the pick and its time are cleared; otherwise the time
   * step would show a day with no times.
   */
  private showView(availabilityView: AvailabilityView): void {
    this.isMonthPickerOpen.set(false);
    if (isSameView(availabilityView, this.availabilityView())) {
      return;
    }
    // One form update for both: the day quietly, then the time, whose change carries the day's too.
    this.dateControl().reset(null, { emitEvent: false });
    this.startAtControl().reset();
    this.store.dispatch(BookingActions.SetAvailabilityView({ availabilityView }));
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

/** A block's days: "Nov 26 – Dec 26". */
function toShortRange({ firstDay, lastDay }: AvailabilityView): string {
  return `${formatMonthDay(fromIsoDate(firstDay))} – ${formatMonthDay(fromIsoDate(lastDay))}`;
}
