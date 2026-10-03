import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TimeSlot } from '../../models/booking.models';

/** A slot as a SelectButton option; PrimeNG reads the disabled flag through optionDisabled. */
interface SlotOption extends TimeSlot { disabled: boolean; }

/** Step 2: open times for the chosen day, as a wrapping PrimeNG SelectButton grid. */
@Component({
  selector: 'app-time-step',
  imports: [
    DatePipe,
    FormsModule,
    SelectButtonModule,
    ProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-step.html',
  styleUrl: './time-step.scss',
})
export class TimeStep {
  readonly slots: InputSignal<TimeSlot[]> = input<TimeSlot[]>([]);
  readonly selected: InputSignal<string | null> = input<string | null>(null);
  readonly day: InputSignal<Date | null> = input<Date | null>(null);
  readonly openCount: InputSignal<number> = input(0);
  readonly loading: InputSignal<boolean> = input(false);

  readonly timeSelect: OutputEmitterRef<string> = output<string>();

  protected readonly options: Signal<SlotOption[]> = computed((): SlotOption[] =>
    this.slots().map((slot: TimeSlot): SlotOption => ({ ...slot, disabled: !slot.available })));
}
