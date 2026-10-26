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
import { CardModule } from 'primeng/card';
import { CheckIcon } from 'primeng/icons/check';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { SessionService } from '../../../../core/services/session.service';
import { formatShortDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../models/booking-confirmation.model';
import { BookingFormValue } from '../../models/booking-form-value.model';
import { BookingNotice } from '../../models/booking-notice.model';
import { SummaryRow } from '../../models/summary-row.model';
import { BOT_CHECK_FAILED_NOTICE, toBookedNotice } from '../../utils/booking-notice.utils';
import { toTimeLabel } from '../../utils/booking-time.utils';
import { NoticeMessage } from '../notice-message/notice-message';

/**
 * Sticky summary panel: the picks so far, the confirm button and the booking's outcome. Its button submits the page's
 * form, which sends the booking.
 */
@Component({
  selector: 'app-booking-summary',
  imports: [
    ButtonModule,
    CardModule,
    CheckIcon,
    SpinnerIcon,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-summary.html',
  styleUrl: './booking-summary.scss',
})
export class BookingSummary {
  readonly bookingFormValue: InputSignal<BookingFormValue> = input.required<BookingFormValue>();
  readonly isFormValid: InputSignal<boolean> = input.required<boolean>();
  readonly isSubmitting: InputSignal<boolean> = input.required<boolean>();
  readonly confirmedBooking: InputSignal<BookingConfirmation | null> = input.required<BookingConfirmation | null>();
  readonly bookingNotice: InputSignal<BookingNotice | null> = input.required<BookingNotice | null>();

  readonly retry: OutputEmitterRef<void> = output();

  private readonly timeZone: Signal<string | null> =
    inject<Store<AppState>>(Store).selectSignal(shopFeature.selectTimeZone);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;
  protected readonly botCheckFailedNotice: BookingNotice = BOT_CHECK_FAILED_NOTICE;

  protected readonly summaryRows: Signal<SummaryRow[]> = computed((): SummaryRow[] => {
    const formValue: BookingFormValue = this.bookingFormValue();
    const timeZone: string | null = this.timeZone();
    return [
      { label: 'Date', value: formValue.date ? formatShortDate(formValue.date) : '—' },
      { label: 'Time', value: formValue.startAt && timeZone ? toTimeLabel(timeZone, formValue.startAt) : '—' },
      { label: 'Name', value: formValue.name.trim() || '—' },
      { label: 'Phone', value: formValue.phone || '—' },
    ];
  });

  protected readonly confirmationNotice: Signal<BookingNotice | null> = computed((): BookingNotice | null => {
    const confirmedBooking: BookingConfirmation | null = this.confirmedBooking();
    const timeZone: string | null = this.timeZone();
    if (!confirmedBooking || !timeZone) {
      return null;
    }
    // Any change to the form clears the booking, and the form is locked while it's sent, so this is the booked phone.
    return toBookedNotice(
      timeZone,
      confirmedBooking.startAt,
      this.bookingFormValue().phone,
    );
  });
}
