import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../../../core/models/shop/phone-links.model';

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
  readonly error: InputSignal<string | null> = input<string | null>(null);
  readonly confirmation: InputSignal<string | null> = input<string | null>(null);
  readonly isBotCheckFailed: InputSignal<boolean> = input(false);
  readonly phone: InputSignal<PhoneLinks> = input.required<PhoneLinks>();

  readonly confirm: OutputEmitterRef<void> = output();
}
