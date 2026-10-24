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
import { ShopInfo } from '../../../../core/models/shop.models';

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
  /** Human-readable confirmation line, e.g. "Saturday, October 3 at 10:30 AM…" */
  readonly confirmation: InputSignal<string | null> = input<string | null>(null);
  /** The visitor failed the bot check, so booking here can't work; they're asked to call or text instead (BR-24). */
  readonly isBotCheckFailed: InputSignal<boolean> = input(false);
  readonly phone: InputSignal<ShopInfo['phone']> = input.required<ShopInfo['phone']>();

  readonly confirm: OutputEmitterRef<void> = output();
}
