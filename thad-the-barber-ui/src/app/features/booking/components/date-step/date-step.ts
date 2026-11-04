import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DatePickerDateMeta, DatePickerMonthChangeEvent } from 'primeng/types/datepicker';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { addDays, fromIsoDate, toIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { DateRange } from '../../models/date-range.model';
import { DayRange } from '../../models/day-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { isFillingUp, toBookingWindow, toMonthRange } from '../../utils/booking-time.utils';

@Component({
  selector: 'app-date-step',
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    ProgressSpinnerModule,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-step.html',
  styleUrl: './date-step.scss',
})
export class DateStep {
  readonly dateControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly dayRange: Signal<DayRange | null> =
    this.store.selectSignal(bookingFeature.selectDayRange);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLoading);
  protected readonly notice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectNotice);
  private readonly openTimeCounts: Signal<Map<string, number>> =
    this.store.selectSignal(bookingFeature.selectOpenTimeCounts);

  protected readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  // Every day of the month in view that isn't open, so only open days can be picked; all of them while it loads.
  protected readonly closedDates: Signal<Date[]> = computed((): Date[] => {
    const dayRange: DayRange | null = this.dayRange();
    const closedDates: Date[] = [];
    if (!dayRange) {
      return closedDates;
    }
    for (
      let day: Date = fromIsoDate(dayRange.firstDay);
      toIsoDate(day) <= dayRange.lastDay;
      day = addDays(day, 1)
    ) {
      if (!this.openTimeCounts().has(toIsoDate(day))) {
        closedDates.push(day);
      }
    }
    return closedDates;
  });

  protected readonly isFirstMonth: Signal<boolean> = computed((): boolean => {
    const dayRange: DayRange | null = this.dayRange();
    const bookingWindow: DateRange | null = this.bookingWindow();
    return !dayRange || !bookingWindow || dayRange.firstDay <= toIsoDate(bookingWindow.min);
  });

  protected readonly isLastMonth: Signal<boolean> = computed((): boolean => {
    const dayRange: DayRange | null = this.dayRange();
    const bookingWindow: DateRange | null = this.bookingWindow();
    return !dayRange || !bookingWindow || dayRange.lastDay >= toIsoDate(bookingWindow.max);
  });

  protected isFillingUp({
    year,
    month,
    day,
  }: DatePickerDateMeta): boolean {
    return isFillingUp(this.openTimeCounts().get(toIsoDate(new Date(
      year,
      month,
      day,
    ))) ?? 0);
  }

  protected reloadMonth(): void {
    const dayRange: DayRange | null = this.dayRange();
    if (dayRange) {
      this.store.dispatch(BookingActions.AvailabilityRequest({ dayRange }));
    }
  }

  // The API refuses a month wholly outside the booking window, which keyboard paging could still reach.
  protected showMonth({ year, month }: DatePickerMonthChangeEvent): void {
    const bookingWindow: DateRange | null = this.bookingWindow();
    if (!year || !month || !bookingWindow) {
      return;
    }
    const dayRange: DayRange = toMonthRange(year, month);
    const isInWindow: boolean = dayRange.lastDay >= toIsoDate(bookingWindow.min)
      && dayRange.firstDay <= toIsoDate(bookingWindow.max);
    if (isInWindow) {
      this.store.dispatch(BookingActions.AvailabilityRequest({ dayRange }));
    }
  }
}
