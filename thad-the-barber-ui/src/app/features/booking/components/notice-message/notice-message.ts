import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
} from '@angular/core';
import { ButtonModule, ButtonSeverity } from 'primeng/button';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingNotice } from '../../models/booking-notice.model';
import { NoticeSeverity } from '../../models/notice-severity.model';

/** An inline booking message. Every problem ends with call, text and Square booking links, and maybe a retry. */
@Component({
  selector: 'app-notice-message',
  imports: [ButtonModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notice-message.html',
  styleUrl: './notice-message.scss',
})
export class NoticeMessage {
  readonly notice: InputSignal<BookingNotice> = input.required<BookingNotice>();
  readonly retry: OutputEmitterRef<void> = output();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly bookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);

  /** Every problem ends with the phone, text and Square's booking site, so a customer is never stuck (BR-14). */
  protected readonly isProblem: Signal<boolean> = computed((): boolean =>
    this.notice().severity !== NoticeSeverity.Success);

  /** PrimeNG calls the error severity `danger`. */
  private readonly buttonSeverities: Record<NoticeSeverity, ButtonSeverity> = {
    [NoticeSeverity.Success]: 'success',
    [NoticeSeverity.Warn]: 'warn',
    [NoticeSeverity.Error]: 'danger',
  };

  protected readonly noticeSeverityToButtonSeverity: Signal<ButtonSeverity> = computed((): ButtonSeverity =>
    this.buttonSeverities[this.notice().severity]);
}
