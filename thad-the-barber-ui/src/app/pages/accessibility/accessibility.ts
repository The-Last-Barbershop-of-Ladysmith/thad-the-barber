import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TitledPage } from '../../shared/components/titled-page/titled-page';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';

@Component({
  selector: 'app-accessibility',
  imports: [TitledPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accessibility.html',
})
export class Accessibility {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
}
