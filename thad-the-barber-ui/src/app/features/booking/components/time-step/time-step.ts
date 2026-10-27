import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FILLING_UP_BELOW } from '../../../../core/config/booking-dates';
import { formatLongDate, fromIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { TimeSlot } from '../../models/time-slot.model';
import { bookingFeature } from '../../state/booking.feature';
import { toTimeSlots } from '../../utils/booking-time.utils';

/** Step 2: open times for the chosen day, as a wrapping PrimeNG SelectButton grid. */
@Component({
  selector: 'app-time-step',
  imports: [
    ReactiveFormsModule,
    MessageModule,
    SelectButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-step.html',
  styleUrl: './time-step.scss',
})
export class TimeStep {
  readonly startAtControl: InputSignal<FormControl<string | null>> = input.required<FormControl<string | null>>();
  readonly selectedDate: InputSignal<string | null> = input.required<string | null>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly availableDays: Signal<AvailableDay[]> = this.store.selectSignal(bookingFeature.selectAvailableDays);

  protected readonly timeSlots: Signal<TimeSlot[]> = computed((): TimeSlot[] => toTimeSlots(
    this.availableDays(),
    this.selectedDate(),
    this.timeZone(),
  ));

  /** "Filling up: only 3 times left this day." while the picked day has fewer than `FILLING_UP_BELOW` (BR-15). */
  protected readonly fillingUpNote: Signal<string | null> = computed((): string | null => {
    const openCount: number = this.timeSlots().length;
    if (openCount === 0 || openCount >= FILLING_UP_BELOW) {
      return null;
    }
    return `Filling up: only ${openCount} ${openCount === 1 ? 'time' : 'times'} left this day.`;
  });

  protected readonly selectedDateLabel: Signal<string | null> = computed((): string | null => {
    const selectedDate: string | null = this.selectedDate();
    return selectedDate ? formatLongDate(fromIsoDate(selectedDate)) : null;
  });
}
