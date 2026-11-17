import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { OVERVIEW_PATH, SIGN_IN_PATH } from '../config/admin-paths';

/** The admin pages need a working admin token; without one the visitor goes to the sign-in page. */
export const adminGuard: CanActivateFn = (): boolean | UrlTree =>
  inject(AdminTokenService).isSignedIn() || inject(Router).createUrlTree([SIGN_IN_PATH]);

/** The sign-in page for someone who is already signed in goes straight to the admin overview. */
export const signInGuard: CanActivateFn = (): boolean | UrlTree =>
  !inject(AdminTokenService).isSignedIn() || inject(Router).createUrlTree([OVERVIEW_PATH]);
