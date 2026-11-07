import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { NavItem } from '../../shared/models/nav-item.model';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { HoursListVariant } from '../../features/shop/models/hours-list-variant.model';
import { ShopAddress } from '../../features/shop/models/shop-address.model';
import { SocialLink } from '../../features/shop/models/social-link.model';
import { homeFeature } from '../../features/home/state/home.feature';
import { HoursList } from '../../features/shop/components/hours-list/hours-list';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    HoursList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly hoursVariant: HoursListVariant = HoursListVariant.Compact;
  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  protected readonly sections: Signal<readonly NavItem[]> = this.store.selectSignal(homeFeature.selectHomeSections);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly social: Signal<SocialLink[]> = this.store.selectSignal(shopFeature.selectSocialLinks);
  protected readonly year: number = new Date().getFullYear();

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
