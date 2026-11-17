import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../testing/axe';
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
        expect(text('[data-testid="admin-email"]')).toBe('owner@example.com');
      },
    );

    it(
      'links to the overview and shows what is not built yet as soon',
      (): void => {
        const host: HTMLElement = fixture.nativeElement as HTMLElement;
        const links: string[] = Array.from(host.querySelectorAll('a.menu-link'))
          .map((link: Element): string => link.getAttribute('href') ?? '');
        const soon: string[] = Array.from(host.querySelectorAll('.menu-link.is-soon'))
          .map((item: Element): string => item.textContent.replace('Soon', '').trim());

        expect(links).toEqual(['/admin/overview']);
        expect(soon).toEqual([
          'Announcements',
          'Gallery',
          'Bookings',
          'Customers',
          'Reviews',
        ]);
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
