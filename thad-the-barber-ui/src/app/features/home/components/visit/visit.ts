import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { ShopAddress } from '../../../shop/models/shop-address.model';
import { HoursList } from '../../../shop/components/hours-list/hours-list';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';

/** Map embed plus location, hours and phone details. */
@Component({
  selector: 'app-visit',
  imports: [
    ButtonModule,
    CardModule,
    HoursList,
    SectionHeading,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visit.html',
  styleUrl: './visit.scss',
})
export class Visit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  private readonly mapEmbedUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectMapEmbedUrl);
  // Google Maps' own origin, with only the encoded address in the query, so trusting it as a resource URL is safe.
  protected readonly mapUrl: Signal<SafeResourceUrl | null> = computed((): SafeResourceUrl | null => {
    const mapEmbedUrl: string | null = this.mapEmbedUrl();
    if (mapEmbedUrl === null) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(mapEmbedUrl);
  });
}
