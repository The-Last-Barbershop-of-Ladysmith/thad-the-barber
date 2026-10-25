import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { HOME_SECTIONS } from '../../core/config/shop-info';
import { NavItem } from '../../shared/models/nav-item.model';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly sections: readonly NavItem[] = HOME_SECTIONS;
}
