import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { DatePickerMonthChangeEvent } from 'primeng/types/datepicker';

/** Step 1: inline PrimeNG date picker. Closed weekdays, full days and out-of-window dates are disabled. */
@Component({
  selector: 'app-date-step',
  imports: [FormsModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-step.html',
  styleUrl: './date-step.scss',
})
export class DateStep {
  readonly value: InputSignal<Date | null> = input<Date | null>(null);
  readonly minDate: InputSignal<Date> = input.required<Date>();
  readonly maxDate: InputSignal<Date> = input.required<Date>();
  readonly disabledDays: InputSignal<number[]> = input<number[]>([]);
  readonly disabledDates: InputSignal<Date[]> = input<Date[]>([]);

  readonly dateSelect: OutputEmitterRef<Date> = output<Date>();
  /** Emits { month: 1-12, year } when the visible month changes. */
  readonly monthChange: OutputEmitterRef<DatePickerMonthChangeEvent> = output<DatePickerMonthChangeEvent>();
}
