import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
} from '@angular/core';
import { ButtonModule, ButtonSeverity } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { PhoneLinks } from '../../models/phone-links.model';
import { AppState } from '../../../store/app.state';
import { shopFeature } from '../../../features/shop/state/shop.feature';
import { ContactCategory } from '../../models/contact-category.model';
import { ContactPrefill } from '../../models/contact-prefill.model';
import { Notice } from '../../models/notice.model';
import { NoticeSeverity } from '../../models/notice-severity.model';
import { scrollBackToElement } from '../../utils/scroll.utils';

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
})
export class NoticeMessage {
  readonly notice: InputSignal<Notice> = input.required<Notice>();
  readonly retry: OutputEmitterRef<void> = output();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly router: Router = inject(Router);
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly bookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);

  /** The address's fragment, which can hold a manage token, is left out of the page the report names. */
  protected readonly reportPrefill: Signal<ContactPrefill | undefined> = computed((): ContactPrefill | undefined => {
    if (!this.notice().canReport) {
      return undefined;
    }
    return {
      category: ContactCategory.Issue,
      pageOrBooking: this.router.url.split(/[?#]/)[0] ?? '',
    };
  });

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

  constructor() {
    // A notice that shows up while the visitor is further down the page (a failed booking, with its button at the
    // bottom) would otherwise be out of sight above them.
    afterRenderEffect((): void => {
      this.notice();
      const box: HTMLElement | null = this.host.querySelector<HTMLElement>('.p-message');
      if (box !== null) {
        scrollBackToElement(box);
      }
    });
  }
}
