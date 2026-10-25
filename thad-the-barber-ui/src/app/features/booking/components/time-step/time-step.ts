import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TimeSlot } from '../../models/time-slot.model';

/** Step 2: open times for the chosen day, as a wrapping PrimeNG SelectButton grid. */
@Component({
  selector: 'app-time-step',
  imports: [
    DatePipe,
    FormsModule,
    SelectButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-step.html',
  styleUrl: './time-step.scss',
})
export class TimeStep {
  readonly slots: InputSignal<TimeSlot[]> = input<TimeSlot[]>([]);
  readonly selected: InputSignal<string | null> = input<string | null>(null);
  readonly day: InputSignal<Date | null> = input<Date | null>(null);

  /** Emits the picked slot's `startAt`. */
  readonly timeSelect: OutputEmitterRef<string> = output<string>();
}
