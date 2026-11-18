import { ChangeDetectionStrategy, Component, WritableSignal, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { DrawerPassThrough } from 'primeng/types/drawer';
import { AdminSessionStorage } from '../../services/admin-session-storage';
import { AppState } from '../../../../store/app.state';
import { AdminSession } from '../../models/admin-session.model';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';
import { AdminMenu } from '../admin-menu/admin-menu';
import { AdminStyles } from '../admin-styles/admin-styles';

/** How often the open admin area checks that the sign-in has not run out or sat idle too long. */
const SESSION_CHECK_MS: number = 30_000;

/** The admin area's frame: a side menu on wide screens, a top bar with a full-screen menu on phones, and the page. */
@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    ButtonModule,
    DrawerModule,
    AdminMenu,
    AdminStyles,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  host: {
    '(document:pointerdown)': 'onActivity()',
    '(document:keydown)': 'onActivity()',
  },
})
export class AdminShell {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly adminSession: AdminSessionStorage = inject(AdminSessionStorage);

  protected readonly isMenuOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly drawerPt: DrawerPassThrough = {
    root: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Admin menu',
    },
  };

  constructor() {
    const restored: AdminSession | null = this.adminSession.getSession();
    if (restored !== null && this.store.selectSignal(adminFeature.selectEmail)() === '') {
      this.store.dispatch(AdminActions.AdminSessionRestored({ session: restored }));
    }
    effect((onCleanup: (cleanup: () => void) => void): void => {
      const timer: ReturnType<typeof setInterval> = setInterval((): void => {
        if (!this.adminSession.isSignedIn()) {
          this.store.dispatch(AdminActions.AdminSessionEnded());
        }
      }, SESSION_CHECK_MS);
      onCleanup((): void => {
        clearInterval(timer);
      });
    });
  }

  protected onActivity(): void {
    this.adminSession.recordActivity();
  }
}
