import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AppState } from '../../../../store/app.state';
import { ADMIN_NAV, ADMIN_PLANNED, AdminNavItem } from '../../config/admin-nav';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';

/** The admin area's frame: a side menu, who is signed in with a sign-out button, and the page. */
@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly email: Signal<string> = this.store.selectSignal(adminFeature.selectEmail);
  protected readonly nav: readonly AdminNavItem[] = ADMIN_NAV;
  protected readonly planned: readonly AdminNavItem[] = ADMIN_PLANNED;

  protected signOut(): void {
    this.store.dispatch(AdminActions.AdminSignOut());
  }
}
