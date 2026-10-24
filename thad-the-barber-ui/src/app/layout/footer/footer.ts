import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { NavItem } from '../../core/models/shop/nav-item.model';
import { PhoneLinks } from '../../core/models/shop/phone-links.model';
import { ShopAddress } from '../../core/models/shop/shop-address.model';
import { SocialLink } from '../../core/models/shop/social-link.model';
import { homeFeature } from '../../features/home/state/home.feature';
import { HoursList } from '../../shared/components/hours-list/hours-list';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../store/shop/shop.feature';

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
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  protected readonly sections: Signal<readonly NavItem[]> = this.store.selectSignal(homeFeature.selectHomeSections);
  protected readonly social: Signal<SocialLink[]> = this.store.selectSignal(shopFeature.selectSocialLinks);
  protected readonly year: number = new Date().getFullYear();

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
