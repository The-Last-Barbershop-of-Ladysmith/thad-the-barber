import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { SelectButtonModule } from 'primeng/selectbutton';
import { toIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../models/available-day.model';
import { TimeSlot } from '../../models/time-slot.model';
import { bookingFeature } from '../../state/booking.feature';
import { toTimeSlots } from '../../utils/booking-time.utils';

/** Step 2: open times for the chosen day, as a wrapping PrimeNG SelectButton grid. */
@Component({
  selector: 'app-time-step',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    SelectButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-step.html',
  styleUrl: './time-step.scss',
})
export class TimeStep {
  readonly startAtControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();
  readonly selectedDate: InputSignal<Date | null> = input.required<Date | null>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly availableDays: Signal<AvailableDay[]> = this.store.selectSignal(bookingFeature.selectAvailableDays);

  protected readonly timeSlots: Signal<TimeSlot[]> = computed((): TimeSlot[] => {
    const selectedDate: Date | null = this.selectedDate();
    return toTimeSlots(
      this.availableDays(),
      selectedDate ? toIsoDate(selectedDate) : null,
      this.timeZone(),
    );
  });
}
