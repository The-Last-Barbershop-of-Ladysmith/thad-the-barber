import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { adminGuard, signInGuard } from './admin.guard';

describe(
  'admin guards',
  (): void => {
    const route: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    const state: RouterStateSnapshot = {} as RouterStateSnapshot;

    function signIn(): void {
      TestBed.inject(AdminTokenService).set('admin-jwt', new Date(Date.now() + 60_000).toISOString());
    }

    function run(guard: typeof adminGuard): boolean | UrlTree {
      return TestBed.runInInjectionContext((): boolean | UrlTree => guard(route, state) as boolean | UrlTree);
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it(
      'lets a signed-in admin into the admin pages',
      (): void => {
        signIn();

        expect(run(adminGuard)).toBe(true);
      },
    );

    it(
      'sends anyone else to the sign-in page',
      (): void => {
        const result: boolean | UrlTree = run(adminGuard);

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/admin');
      },
    );

    it(
      'shows the sign-in page to someone who is signed out',
      (): void => {
        expect(run(signInGuard)).toBe(true);
      },
    );

    it(
      'sends a signed-in admin from the sign-in page to the overview',
      (): void => {
        signIn();

        const result: boolean | UrlTree = run(signInGuard);

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/admin/overview');
      },
    );
  },
);
