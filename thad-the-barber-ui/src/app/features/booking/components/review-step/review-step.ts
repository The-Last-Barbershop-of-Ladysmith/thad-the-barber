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
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { SessionService } from '../../../../core/services/session.service';
import { formatFullDate, fromIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingFormValue } from '../../models/booking-form-value.model';
import { BookingStep } from '../../models/booking-step.model';
import { SummaryRow } from '../../models/summary-row.model';
import { toTimeLabel } from '../../utils/booking-time.utils';

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
  readonly isFormValid: InputSignal<boolean> = input.required<boolean>();
  readonly isSubmitting: InputSignal<boolean> = input.required<boolean>();

  readonly changeStep: OutputEmitterRef<BookingStep> = output();

  private readonly timeZone: Signal<string | null> =
    inject<Store<AppState>>(Store).selectSignal(shopFeature.selectTimeZone);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;

  protected readonly summaryRows: Signal<SummaryRow[]> = computed((): SummaryRow[] => {
    const formValue: BookingFormValue = this.bookingFormValue();
    const timeZone: string | null = this.timeZone();
    return [
      {
        label: 'Date',
        value: formValue.date ? formatFullDate(fromIsoDate(formValue.date)) : '—',
        step: BookingStep.Date,
      },
      {
        label: 'Time',
        value: formValue.startAt && timeZone ? toTimeLabel(timeZone, formValue.startAt) : '—',
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
