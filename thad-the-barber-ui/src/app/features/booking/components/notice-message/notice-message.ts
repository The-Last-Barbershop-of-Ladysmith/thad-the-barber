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
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { BookingNotice } from '../../models/booking-notice.model';
import { NoticeFallback } from '../../models/notice-fallback.model';

/** An inline booking message with, when the notice asks for them, Square booking, call and text links and a retry. */
@Component({
  selector: 'app-notice-message',
  imports: [ButtonModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notice-message.html',
  styleUrl: './notice-message.scss',
})
export class NoticeMessage {
  readonly notice: InputSignal<BookingNotice> = input.required<BookingNotice>();
  readonly phone: InputSignal<PhoneLinks> = input.required<PhoneLinks>();
  readonly bookingUrl: InputSignal<string> = input.required<string>();

  readonly retry: OutputEmitterRef<void> = output();

  protected readonly noticeFallback: typeof NoticeFallback = NoticeFallback;
  protected readonly hasContactLinks: Signal<boolean> = computed((): boolean =>
    this.notice().fallback !== NoticeFallback.None);
}
