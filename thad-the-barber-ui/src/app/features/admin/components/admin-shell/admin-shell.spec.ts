import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../testing/axe';
import { ADMIN_IDLE_LIMIT_MS, AdminSessionStorage } from '../../services/admin-session-storage';
import { AppState } from '../../../../store/app.state';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';
import { AdminShell } from './admin-shell';

describe(
  'AdminShell',
  (): void => {
    let fixture: ComponentFixture<AdminShell>;
    let store: Store<AppState>;
    let dispatchSpy: MockInstance<Store<AppState>['dispatch']>;

    function text(selector: string): string {
      return (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent.trim() ?? '';
    }

    // The admin sign-in is kept in the tab's session storage, which outlives a test.

    beforeEach((): void => {

      sessionStorage.clear();

    });


    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [adminFeature.name]: adminFeature.reducer }),
          provideRouter([]),
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(AdminActions.AdminSignInRequestSuccess({
        session: {
          email: 'owner@example.com',
          name: 'Q. Testperson',
          expiresAt: '2031-02-28T12:30:00Z',
        },
      }));
      dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture = TestBed.createComponent(AdminShell);
      fixture.detectChanges();
    });

    it(
      'says who is signed in',
      (): void => {
        expect(text('[data-testid="admin-name"]')).toBe('Q. Testperson');
        expect(text('[data-testid="admin-email"]')).toBe('owner@example.com');
      },
    );

    it(
      'shows only the email when Google gave no name',
      (): void => {
        store.dispatch(AdminActions.AdminSignInRequestSuccess({
          session: {
            email: 'nameless@example.com',
            name: null,
            expiresAt: '2031-02-28T12:30:00Z',
          },
        }));
        fixture.detectChanges();

        expect(text('[data-testid="admin-email"]')).toBe('nameless@example.com');
        expect(text('[data-testid="admin-name"]')).toBe('');
      },
    );

    it(
      'links to the overview and shows what is not built yet as soon',
      (): void => {
        const host: HTMLElement = fixture.nativeElement as HTMLElement;
        const links: string[] = Array.from(host.querySelectorAll('a.menu-link'))
          .map((link: Element): string => link.getAttribute('href') ?? '');
        const soon: string[] = Array.from(host.querySelectorAll('.planned-row'))
          .map((item: Element): string => item.textContent.replace('Soon', '').trim());

        expect(links).toEqual([
          '/admin/overview',
          '/admin/announcements',
          '/admin/gallery',
          '/admin/shop',
        ]);
        expect(soon).toEqual([
          'Bookings',
          'Customers',
          'Reviews',
        ]);
      },
    );

    it(
      'opens the menu in a full-screen drawer on a phone and closes it after a link is followed',
      async (): Promise<void> => {
        TestBed.inject(Router).resetConfig([{ path: '**', children: [] }]);
        const host: HTMLElement = fixture.nativeElement as HTMLElement;
        expect(document.querySelector('.p-drawer')).toBeNull();

        host.querySelector<HTMLButtonElement>('[data-testid="admin-menu-toggle"]')?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        const drawerLinks: NodeListOf<HTMLAnchorElement> = document.querySelectorAll<HTMLAnchorElement>('.p-drawer a.menu-link');
        expect(drawerLinks).toHaveLength(4);

        drawerLinks[1]?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(host.querySelector<HTMLButtonElement>('[data-testid="admin-menu-toggle"]')?.getAttribute('aria-expanded')).toBe('false');
      },
    );

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'tells the state who is signed in again after a reload',
      (): void => {
        TestBed.inject(AdminSessionStorage).start(
          'admin-jwt',
          new Date(Date.now() + ADMIN_IDLE_LIMIT_MS * 4).toISOString(),
          'back@example.test',
          null,
        );
        store.dispatch(AdminActions.AdminSignOut());
        dispatchSpy.mockClear();

        TestBed.createComponent(AdminShell);

        expect(dispatchSpy).toHaveBeenCalledWith(
          AdminActions.AdminSessionRestored({
            session: {
              email: 'back@example.test',
              name: null,
              expiresAt: expect.any(String) as string,
            },
          }),
        );
      },
    );

    it(
      'ends the session when the admin sits idle too long, and keeps it while they are active',
      (): void => {
        vi.useFakeTimers();
        TestBed.inject(AdminSessionStorage).start(
          'admin-jwt',
          new Date(Date.now() + ADMIN_IDLE_LIMIT_MS * 8).toISOString(),
          'owner@example.test',
          null,
        );
        TestBed.createComponent(AdminShell).detectChanges();
        dispatchSpy.mockClear();

        vi.advanceTimersByTime(ADMIN_IDLE_LIMIT_MS - 60_000);
        document.dispatchEvent(new Event('pointerdown'));
        vi.advanceTimersByTime(ADMIN_IDLE_LIMIT_MS - 60_000);
        expect(dispatchSpy).not.toHaveBeenCalledWith(AdminActions.AdminSessionEnded());

        vi.advanceTimersByTime(ADMIN_IDLE_LIMIT_MS);
        expect(dispatchSpy).toHaveBeenCalledWith(AdminActions.AdminSessionEnded());
      },
    );

    it(
      'signs out from its button',
      (): void => {
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="admin-sign-out"]')?.click();

        expect(dispatchSpy).toHaveBeenCalledWith(AdminActions.AdminSignOut());
      },
    );

    it(
      'has one landmark for the menu and none that repeat the page’s main',
      (): void => {
        const host: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('nav')).toHaveLength(1);
        expect(host.querySelector('main')).toBeNull();
      },
    );

    it(
      'has no accessibility violations',
      async (): Promise<void> => {
        await expectNoAxeViolations(fixture.nativeElement as HTMLElement);
      },
    );
  },
);
