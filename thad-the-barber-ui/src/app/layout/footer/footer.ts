import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import {
  HOME_SECTIONS,
  SHOP_INFO,
  SOCIAL_LINKS,
} from '../../core/config/shop-info';
import {
  NavItem,
  ShopInfo,
  SocialLink,
} from '../../core/models/shop.models';
import { HoursList } from '../../shared/components/hours-list/hours-list';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    ButtonModule,
    HoursList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly shop: ShopInfo = SHOP_INFO;
  protected readonly sections: readonly NavItem[] = HOME_SECTIONS;
  protected readonly social: readonly SocialLink[] = SOCIAL_LINKS;
  protected readonly year: number = new Date().getFullYear();

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
