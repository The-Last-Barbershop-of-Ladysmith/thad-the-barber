import { ChangeDetectionStrategy, Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { BookingNotice } from '../../models/booking-notice.model';
import { BOT_CHECK_FAILED_NOTICE } from '../../utils/booking-notice.utils';
import { NoticeMessage } from '../notice-message/notice-message';

export interface SummaryRow {
  label: string;
  value: string;
}

/** Sticky summary panel with the confirm button and booking outcome. */
@Component({
  selector: 'app-booking-summary',
  imports: [
    ButtonModule,
    CardModule,
    MessageModule,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-summary.html',
  styleUrl: './booking-summary.scss',
})
export class BookingSummary {
  readonly rows: InputSignal<SummaryRow[]> = input.required<SummaryRow[]>();
  readonly submitting: InputSignal<boolean> = input(false);
  readonly booked: InputSignal<boolean> = input(false);
  readonly hint: InputSignal<string | null> = input<string | null>(null);
  readonly notice: InputSignal<BookingNotice | null> = input<BookingNotice | null>(null);
  readonly confirmation: InputSignal<string | null> = input<string | null>(null);
  readonly isBotCheckFailed: InputSignal<boolean> = input(false);
  readonly phone: InputSignal<PhoneLinks> = input.required<PhoneLinks>();
  readonly bookingUrl: InputSignal<string> = input.required<string>();

  readonly confirm: OutputEmitterRef<void> = output();

  protected readonly botCheckFailedNotice: BookingNotice = BOT_CHECK_FAILED_NOTICE;
}
