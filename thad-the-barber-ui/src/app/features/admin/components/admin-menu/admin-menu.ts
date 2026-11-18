import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, inject, output, OutputEmitterRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AppState } from '../../../../store/app.state';
import { ADMIN_NAV, ADMIN_PLANNED, AdminNavItem } from '../../config/admin-nav';
import { AdminSession } from '../../models/admin-session.model';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';

/** The admin menu: the logo, the sections, what comes later, and who is signed in with Sign out. */
@Component({
  selector: 'app-admin-menu',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.scss',
})
export class AdminMenu {
  /** A link was followed, so a menu in a drawer can close. */
  readonly navigated: OutputEmitterRef<void> = output();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly email: Signal<string> = this.store.selectSignal(adminFeature.selectEmail);
  protected readonly name: Signal<string | null> = this.store.selectSignal(adminFeature.selectName);
  protected readonly session: Signal<AdminSession | null> = this.store.selectSignal(adminFeature.selectSession);
  protected readonly nav: readonly AdminNavItem[] = ADMIN_NAV;
  protected readonly planned: readonly AdminNavItem[] = ADMIN_PLANNED;

  protected readonly initial: Signal<string> = computed((): string =>
    (this.name() ?? this.email()).charAt(0).toUpperCase());

  protected signOut(): void {
    this.store.dispatch(AdminActions.AdminSignOut());
  }
}
