import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OnInit,
  Signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DatePickerMonthChangeEvent } from 'primeng/types/datepicker';
import { fromMonthKey, toMonthKey } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { DateRange } from '../../models/date-range.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { toBookingWindow } from '../../utils/booking-time.utils';

/** Step 1: inline PrimeNG date picker. Days with no open times (closed or full) and out-of-window days are disabled. */
@Component({
  selector: 'app-date-step',
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    ProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-step.html',
  styleUrl: './date-step.scss',
})
export class DateStep implements OnInit {
  readonly dateControl: InputSignal<FormControl<Date | null>> = input.required<FormControl<Date | null>>();
  readonly startAtControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly visibleMonth: Signal<string | null> = this.store.selectSignal(bookingFeature.selectVisibleMonth);
  protected readonly disabledDates: Signal<Date[]> = this.store.selectSignal(bookingFeature.selectDisabledDates);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLoading);

  protected readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  protected readonly visibleMonthStart: Signal<Date | undefined> = computed((): Date | undefined => {
    const visibleMonth: string | null = this.visibleMonth();
    if (!visibleMonth) {
      return undefined;
    }
    return fromMonthKey(visibleMonth);
  });

  ngOnInit(): void {
    this.store.dispatch(BookingActions.SetActiveMonthView({
      month: toMonthKey(this.bookingWindow()?.min ?? new Date()),
    }));
  }

  protected onDateSelect(): void {
    this.startAtControl().reset();
  }

  protected onMonthChange(monthChange: DatePickerMonthChangeEvent): void {
    if (monthChange.month === undefined || monthChange.year === undefined) {
      return;
    }
    this.store.dispatch(BookingActions.SetActiveMonthView({
      month: toMonthKey(new Date(
        monthChange.year,
        monthChange.month - 1,
        1,
      )),
    }));
  }
}
