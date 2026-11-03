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
import { FILLING_UP_BELOW, MAX_DAYS_PER_AVAILABILITY_REQUEST } from '../../../../core/config/booking-dates';
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
import { toBookingWindow, toLaterMonths, toMonthView, toUpcomingView } from '../../utils/booking-time.utils';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';

interface DateOption {
  date: string;
  label: string;
  accessibleLabel: string;
  openCount: number;
  isFillingUp: boolean;
}

interface MonthOption {
  month: string;
  shortLabel: string;
  longLabel: string;
}

interface MonthOptionGroup {
  year: number;
  monthOptions: MonthOption[];
}

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

  protected readonly upcomingLabel: string = `Next ${MAX_DAYS_PER_AVAILABILITY_REQUEST} days`;
  protected readonly noOpenDaysNotice: Notice = NO_OPEN_DAYS_NOTICE;
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

  protected readonly viewMonth: Signal<string | null> = computed((): string | null => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    return availabilityView?.kind === AvailabilityViewKind.Month ? availabilityView.firstDay.slice(0, 7) : null;
  });

  private readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  protected readonly isTodaysBlock: Signal<boolean> = computed((): boolean => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    return !availabilityView || !bookingWindow || (availabilityView.kind === AvailabilityViewKind.Upcoming
      && availabilityView.firstDay === toIsoDate(bookingWindow.min));
  });

  private readonly laterMonths: Signal<string[]> = computed((): string[] => {
    const bookingWindow: DateRange | null = this.bookingWindow();
    return bookingWindow ? toLaterMonths(bookingWindow) : [];
  });

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
    this.toMonthOptionGroups(this.laterMonths()));

  protected readonly viewTitle: Signal<string> = computed((): string => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (availabilityView?.kind === AvailabilityViewKind.Month) {
      return formatMonthYear(fromIsoDate(availabilityView.firstDay));
    }
    if (!availabilityView || this.isTodaysBlock()) {
      return this.upcomingLabel;
    }
    return this.toShortRange(availabilityView);
  });

  protected readonly rangeCaption: Signal<string> = computed((): string => {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (!availabilityView) {
      return '';
    }
    const dayCount: number = this.availableDays().length;
    const openDayCount: string = this.isLoading() ? '' : ` · ${dayCount} open ${dayCount === 1 ? 'day' : 'days'}`;
    const shownDays: string = availabilityView.kind === AvailabilityViewKind.Month ? `all of ${this.viewTitle()}` : this.toShortRange(availabilityView);
    return `Showing ${shownDays}${openDayCount}`;
  });

  protected readonly dateOptions: Signal<DateOption[]> = computed((): DateOption[] =>
    this.availableDays().map((availableDay: AvailableDay): DateOption => this.toDateOption(availableDay)));

  protected readonly hasNoOpenDays: Signal<boolean> = computed((): boolean =>
    this.loadStatus() === RequestStatus.Success && this.availableDays().length === 0);

  protected toggleMonthPicker(): void {
    this.isMonthPickerOpen.update((isOpen: boolean): boolean => !isOpen);
  }

  protected closeMonthPicker(): void {
    this.isMonthPickerOpen.set(false);
    this.monthPickerToggle()?.nativeElement.focus();
  }

  protected showMonth(month: string): void {
    this.showView(toMonthView(month));
  }

  protected showUpcoming(): void {
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (bookingWindow) {
      this.showView(toUpcomingView(bookingWindow.min, bookingWindow));
    }
  }

  protected showAdjacentView(offset: number): void {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (!availabilityView || !bookingWindow) {
      return;
    }
    const firstDay: Date = fromIsoDate(availabilityView.firstDay);
    if (availabilityView.kind === AvailabilityViewKind.Upcoming) {
      this.showView(toUpcomingView(addDays(firstDay, offset * MAX_DAYS_PER_AVAILABILITY_REQUEST), bookingWindow));
    } else {
      this.showView(toMonthView(toMonthKey(addMonths(firstDay, offset))));
    }
  }

  // Another view's days don't include the picked day, so the time step would show a day with no times.
  private showView(availabilityView: AvailabilityView): void {
    this.isMonthPickerOpen.set(false);
    // One form update for both: the time's change carries the day's.
    this.dateControl().reset(null, { emitEvent: false });
    this.startAtControl().reset();
    this.store.dispatch(BookingActions.SetAvailabilityView({ availabilityView }));
  }

  private toMonthOptionGroups(months: string[]): MonthOptionGroup[] {
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

  private toDateOption(availableDay: AvailableDay): DateOption {
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

  private toShortRange({ firstDay, lastDay }: AvailabilityView): string {
    return `${formatMonthDay(fromIsoDate(firstDay))} – ${formatMonthDay(fromIsoDate(lastDay))}`;
  }
}
