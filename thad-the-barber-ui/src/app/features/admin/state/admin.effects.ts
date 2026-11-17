import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, exhaustMap, map, of, switchMap, tap } from 'rxjs';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { AdminConfigDto } from '../dtos/admin-config.dto';
import { OVERVIEW_PATH, SIGN_IN_PATH } from '../config/admin-paths';
import { AdminSessionDto } from '../dtos/admin-session.dto';
import { AdminService } from '../services/admin.service';
import { toAdminSignInError } from '../utils/admin-sign-in-error.utils';
import * as AdminActions from './admin.actions';

export const loadAdminConfig: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    adminService: AdminService = inject(AdminService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminActions.AdminConfigRequest),
      exhaustMap((): Observable<Action> =>
        adminService.getConfig().pipe(
          map((config: AdminConfigDto): Action =>
            AdminActions.AdminConfigRequestSuccess({ googleClientId: config.googleClientId })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminActions.AdminConfigRequestFailure({ error: toAdminSignInError(error) }))),
        )),
    ),
  { functional: true },
);

/** Takes Google's ID token to the API; the admin token it gets back goes to `AdminTokenService`, never the store. */
export const signInToAdmin: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    adminService: AdminService = inject(AdminService),
    adminTokenService: AdminTokenService = inject(AdminTokenService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminActions.AdminSignInRequest),
      switchMap(({ idToken }: { idToken: string; }): Observable<Action> =>
        adminService.signIn(idToken).pipe(
          tap((session: AdminSessionDto): void => {
            adminTokenService.set(session.token, session.expiresAt);
          }),
          map((session: AdminSessionDto): Action =>
            AdminActions.AdminSignInRequestSuccess({
              session: {
                email: session.email,
                expiresAt: session.expiresAt,
              },
            })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminActions.AdminSignInRequestFailure({ error: toAdminSignInError(error) }))),
        )),
    ),
  { functional: true },
);

export const openOverviewAfterSignIn: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(AdminActions.AdminSignInRequestSuccess),
      tap((): void => {
        void router.navigateByUrl(OVERVIEW_PATH);
      }),
    ),
  { functional: true, dispatch: false },
);

/** Signing out, or the token running out, drops the token and goes back to the sign-in page. */
export const leaveAdmin: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
    adminTokenService: AdminTokenService = inject(AdminTokenService),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(AdminActions.AdminSignOut, AdminActions.AdminSessionEnded),
      tap((): void => {
        adminTokenService.clear();
        void router.navigateByUrl(SIGN_IN_PATH);
      }),
    ),
  { functional: true, dispatch: false },
);
