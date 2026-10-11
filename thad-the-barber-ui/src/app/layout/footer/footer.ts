import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SHOP_INFO, SOCIAL_LINKS } from '../../core/config/shop-info';
import {
  NavItem,
  ShopInfo,
  SocialLink,
} from '../../core/models/shop.models';
import { selectHomeSections } from '../../features/home/state/home-sections.selectors';
import { HoursList } from '../../shared/components/hours-list/hours-list';
import { AppState } from '../../store/app.state';

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

  protected readonly shop: ShopInfo = SHOP_INFO;
  protected readonly sections: Signal<readonly NavItem[]> = this.store.selectSignal(selectHomeSections);
  protected readonly social: readonly SocialLink[] = SOCIAL_LINKS;
  protected readonly year: number = new Date().getFullYear();

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
