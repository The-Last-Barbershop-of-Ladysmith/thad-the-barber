import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OutputEmitterRef,
  Signal,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { SessionService } from '../../../../core/services/session.service';
import { BookingFormValue } from '../../models/booking-form-value.model';
import { BookingStep } from '../../models/booking-step.model';

/** A review row: what was picked, and the step its Change link opens. */
interface SummaryRow {
  label: string;
  value: string;
  step: BookingStep;
}

/**
 * Step 4 (#209): everything picked, each with a Change link back to its step, and the confirm button, which submits
 * the page's form.
 */
@Component({
  selector: 'app-review-step',
  imports: [ButtonModule, SpinnerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-step.html',
  styleUrl: './review-step.scss',
})
export class ReviewStep {
  readonly bookingFormValue: InputSignal<BookingFormValue> = input.required<BookingFormValue>();
  /** The page's labels for the picked day and time, on the shop's clock. */
  readonly dateLabel: InputSignal<string | null> = input.required<string | null>();
  readonly timeLabel: InputSignal<string | null> = input.required<string | null>();
  readonly isFormValid: InputSignal<boolean> = input.required<boolean>();
  readonly isSubmitting: InputSignal<boolean> = input.required<boolean>();

  readonly changeStep: OutputEmitterRef<BookingStep> = output();

  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;

  protected readonly summaryRows: Signal<SummaryRow[]> = computed((): SummaryRow[] => {
    const formValue: BookingFormValue = this.bookingFormValue();
    return [
      {
        label: 'Date',
        value: this.dateLabel() ?? '—',
        step: BookingStep.Date,
      },
      {
        label: 'Time',
        value: this.timeLabel() ?? '—',
        step: BookingStep.Time,
      },
      {
        label: 'Name',
        value: formValue.name.trim() || '—',
        step: BookingStep.Details,
      },
      {
        label: 'Phone',
        value: formValue.phone || '—',
        step: BookingStep.Details,
      },
    ];
  });
}
