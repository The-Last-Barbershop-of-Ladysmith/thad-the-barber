import { ChangeDetectionStrategy, Component, type Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type Event, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { filter, map } from 'rxjs';
import { HOME_SECTIONS, SHOP_INFO } from '../../core/config/shop-info';
import { type NavItem, type ShopInfo } from '../../core/models/shop.models';
import { LayoutActions } from '../../store/app.actions';
import { selectMenuOpen } from '../../store/app.feature';
import { type AppState } from '../../store/app.state';

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

  protected readonly shop: ShopInfo = SHOP_INFO;
  protected readonly sections: readonly NavItem[] = HOME_SECTIONS;
  protected readonly menuOpen: Signal<boolean> = this.store.selectSignal(selectMenuOpen);
  protected readonly onBookingPage: Signal<boolean> = toSignal(
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd): boolean => event.urlAfterRedirects.startsWith('/book')),
    ),
    { initialValue: false },
  );

  protected toggleMenu(): void {
    this.store.dispatch(LayoutActions.menuToggled());
  }

  protected closeMenu(): void {
    this.store.dispatch(LayoutActions.menuClosed());
  }
}
