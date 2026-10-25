import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Event, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { filter, map } from 'rxjs';
import { NavItem } from '../../core/models/shop/nav-item.model';
import { PhoneLinks } from '../../core/models/shop/phone-links.model';
import { homeFeature } from '../../features/home/state/home.feature';
import * as LayoutActions from '../../store/app.actions';
import { layoutFeature } from '../../store/app.feature';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../store/shop/shop.feature';

/** Fixed top bar: section links on desktop, a drawer menu on mobile, "Back to site" on the booking page. */
@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    ButtonModule,
    DrawerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly router: Router = inject(Router);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly sections: Signal<readonly NavItem[]> = this.store.selectSignal(homeFeature.selectHomeSections);
  protected readonly menuOpen: Signal<boolean> = this.store.selectSignal(layoutFeature.selectMenuOpen);
  protected readonly onBookingPage: Signal<boolean> = toSignal(
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd): boolean => event.urlAfterRedirects.startsWith('/book')),
    ),
    { initialValue: false },
  );

  protected toggleMenu(): void {
    this.store.dispatch(LayoutActions.MenuToggle());
  }

  protected closeMenu(): void {
    this.store.dispatch(LayoutActions.MenuClose());
  }
}
