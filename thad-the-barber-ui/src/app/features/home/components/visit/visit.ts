import { ChangeDetectionStrategy, Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { ShopAddress } from '../../../shop/models/shop-address.model';
import { HoursList } from '../../../shop/components/hours-list/hours-list';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';

/** Themed map image plus location, hours and phone details. */
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

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  protected readonly staticMapUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectStaticMapUrl);

  private readonly hasMapFailed: WritableSignal<boolean> = signal(false);
  protected readonly isMapShown: Signal<boolean> = computed(
    (): boolean => this.staticMapUrl() !== null && !this.hasMapFailed(),
  );

  protected hideMap(): void {
    this.hasMapFailed.set(true);
  }
}
