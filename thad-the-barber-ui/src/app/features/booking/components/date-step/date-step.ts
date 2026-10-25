import { ChangeDetectionStrategy, Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DatePickerMonthChangeEvent } from 'primeng/types/datepicker';

/** Step 1: inline PrimeNG date picker. Days with no open times (closed or full) and out-of-window days are disabled. */
@Component({
  selector: 'app-date-step',
  imports: [
    FormsModule,
    DatePickerModule,
    ProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-step.html',
  styleUrl: './date-step.scss',
})
export class DateStep {
  readonly value: InputSignal<Date | null> = input<Date | null>(null);
  readonly minDate: InputSignal<Date | null> = input<Date | null>(null);
  readonly maxDate: InputSignal<Date | null> = input<Date | null>(null);
  readonly disabledDates: InputSignal<Date[]> = input<Date[]>([]);
  /** The month to show when no day is picked yet. */
  readonly month: InputSignal<Date | undefined> = input<Date | undefined>(undefined);
  /** The month's open days are loading; every day shows disabled until they arrive. */
  readonly isLoading: InputSignal<boolean> = input(false);

  readonly dateSelect: OutputEmitterRef<Date> = output<Date>();
  /** Emits { month: 1-12, year } when the visible month changes. */
  readonly monthChange: OutputEmitterRef<DatePickerMonthChangeEvent> = output<DatePickerMonthChangeEvent>();
}
