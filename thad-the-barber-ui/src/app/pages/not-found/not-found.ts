import {
  ChangeDetectionStrategy,
  Component,
  RESPONSE_INIT,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HOME_SECTIONS, SHOP_INFO } from '../../core/config/shop-info';
import { NavItem, ShopInfo } from '../../core/models/shop.models';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  protected readonly shop: ShopInfo = SHOP_INFO;
  protected readonly sections: readonly NavItem[] = HOME_SECTIONS;

  constructor() {
    const response: ResponseInit | null = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
  }
}
