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
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../models/phone-links.model';
import { AppState } from '../../../store/app.state';
import { shopFeature } from '../../../features/shop/state/shop.feature';
import { Notice } from '../../models/notice.model';
import { NoticeSeverity } from '../../models/notice-severity.model';

/** An inline message. Every problem ends with call, text and Square booking links, and maybe a retry. */
@Component({
  selector: 'app-notice-message',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notice-message.html',
  styleUrl: './notice-message.scss',
})
export class NoticeMessage {
  readonly notice: InputSignal<Notice> = input.required<Notice>();
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
    [NoticeSeverity.Info]: 'info',
    [NoticeSeverity.Warn]: 'warn',
    [NoticeSeverity.Error]: 'danger',
  };

  /** The icon tells the severity apart without relying on colour. */
  private readonly severityIcons: Record<NoticeSeverity, string> = {
    [NoticeSeverity.Success]: 'pi pi-check-circle',
    [NoticeSeverity.Info]: 'pi pi-info-circle',
    [NoticeSeverity.Warn]: 'pi pi-exclamation-triangle',
    [NoticeSeverity.Error]: 'pi pi-exclamation-circle',
  };

  protected readonly severityIcon: Signal<string> = computed((): string => this.severityIcons[this.notice().severity]);

  protected readonly noticeSeverityToButtonSeverity: Signal<ButtonSeverity> = computed((): ButtonSeverity =>
    this.buttonSeverities[this.notice().severity]);
}
