import { ChangeDetectionStrategy, Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../../../environments/environment';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { ShopAddress } from '../../../shop/models/shop-address.model';
import { toStaticMapUrl } from '../../utils/static-map.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';

/** Street address, directions and phone buttons beside the themed map image. */
@Component({
  selector: 'app-visit',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visit.html',
  styleUrl: './visit.scss',
})
export class Visit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  private readonly addressLine: Signal<string | null> = this.store.selectSignal(shopFeature.selectAddressLine);
  private readonly hasMapFailed: WritableSignal<boolean> = signal(false);

  protected readonly mapImageUrl: Signal<string | null> = computed((): string | null => {
    const addressLine: string | null = this.addressLine();
    if (addressLine === null || this.hasMapFailed()) {
      return null;
    }
    return toStaticMapUrl(
      addressLine,
      environment.staticMapApiKey,
      environment.staticMapId,
    );
  });

  protected hideMap(): void {
    this.hasMapFailed.set(true);
  }
}
