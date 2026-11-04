import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';

@Component({
  selector: 'app-privacy',
  imports: [Backdrop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class Privacy {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
}
