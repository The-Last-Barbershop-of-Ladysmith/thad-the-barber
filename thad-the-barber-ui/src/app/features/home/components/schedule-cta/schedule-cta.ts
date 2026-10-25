import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { OpenStatus } from '../../../../core/models/shop/open-status.model';
import { PhoneLinks } from '../../../../core/models/shop/phone-links.model';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ShopHoursService } from '../../../../core/services/shop-hours.service';
import { HoursList } from '../../../../shared/components/hours-list/hours-list';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../../store/shop/shop.feature';

/** "Ready for a cut?" panel: live open status, booking + call buttons, weekly hours. */
@Component({
  selector: 'app-schedule-cta',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    HoursList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule-cta.html',
  styleUrl: './schedule-cta.scss',
})
export class ScheduleCta {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly status: Signal<OpenStatus | null> = inject(ShopHoursService).currentOpenStatus;
}
