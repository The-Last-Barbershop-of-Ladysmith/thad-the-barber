import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  inject,
} from '@angular/core';
import { OpenStatus, ShopInfo } from '../../../../core/models/shop.models';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SHOP_INFO } from '../../../../core/config/shop-info';
import { ShopHoursService } from '../../../../core/services/shop-hours.service';
import { HoursList } from '../../../../shared/components/hours-list/hours-list';

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
  protected readonly shop: ShopInfo = SHOP_INFO;
  protected readonly status: Signal<OpenStatus> = inject(ShopHoursService).status;
}
