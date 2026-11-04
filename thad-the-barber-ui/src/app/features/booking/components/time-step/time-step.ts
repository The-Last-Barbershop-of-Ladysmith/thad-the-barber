import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { formatLongDate, fromIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AvailableDay } from '../../dtos/available-day.dto';
import { bookingFeature } from '../../state/booking.feature';
import { isFillingUp, toTimeLabel } from '../../utils/booking-time.utils';

/** An open start time: the UTC instant the API returned and its label on the shop's clock ("2:30 PM"). */
interface TimeSlot {
  startAt: string;
  label: string;
}

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

  protected readonly timeSlots: Signal<TimeSlot[]> = computed((): TimeSlot[] => {
    const timeZone: string | null = this.timeZone();
    if (!timeZone) {
      return [];
    }
    const times: string[] = this.availableDays()
      .find((day: AvailableDay): boolean => day.date === this.selectedDate())?.times ?? [];
    return times.map((startAt: string): TimeSlot => ({ startAt, label: toTimeLabel(timeZone, startAt) }));
  });

  protected readonly fillingUpNote: Signal<string | null> = computed((): string | null => {
    const openCount: number = this.timeSlots().length;
    if (!isFillingUp(openCount)) {
      return null;
    }
    return `Filling up: only ${openCount} ${openCount === 1 ? 'time' : 'times'} left this day.`;
  });

  protected readonly selectedDateLabel: Signal<string | null> = computed((): string | null => {
    const selectedDate: string | null = this.selectedDate();
    return selectedDate ? formatLongDate(fromIsoDate(selectedDate)) : null;
  });
}
