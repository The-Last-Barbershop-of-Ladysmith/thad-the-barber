import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { AdminConfigDto } from '../dtos/admin-config.dto';
import { AdminSessionDto } from '../dtos/admin-session.dto';
import { AdminSignInError } from '../models/admin-sign-in-error.model';
import { AdminService } from '../services/admin.service';
import { AdminSessionStorage } from '../services/admin-session-storage';
import * as AdminActions from './admin.actions';
import { leaveAdmin, loadAdminConfig, openOverviewAfterSignIn, signInToAdmin } from './admin.effects';

describe(
  'admin effects',
  (): void => {
    const sessionDto: AdminSessionDto = {
      token: 'admin-jwt',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      email: 'owner@example.com',
      name: 'Q. Testperson',
    };
    let actions: Subject<Action>;
    let adminService: {
      getConfig: () => Observable<AdminConfigDto>;
      signIn: (idToken: string) => Observable<AdminSessionDto>;
    };
    let navigations: string[];

    // The admin sign-in is kept in the tab's session storage, which outlives a test.

    beforeEach((): void => {

      sessionStorage.clear();

    });


    beforeEach((): void => {
      actions = new Subject<Action>();
      navigations = [];
      adminService = {
        getConfig: (): Observable<AdminConfigDto> => of({ googleClientId: 'client-1' }),
        signIn: (): Observable<AdminSessionDto> => of(sessionDto),
      };
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: actions },
          { provide: AdminService, useFactory: (): unknown => adminService },
          {
            provide: Router,
            useValue: {
              navigateByUrl: (url: string): Promise<boolean> => {
                navigations.push(url);
                return Promise.resolve(true);
              },
            },
          },
        ],
      });
    });

    function emitted(effect: unknown, action: Action): Action[] {
      const results: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => (effect as () => Observable<Action>)())
        .subscribe((result: Action): void => {
          results.push(result);
        });
      actions.next(action);
      return results;
    }

    function problem(code: string, status: number): HttpErrorResponse {
      return new HttpErrorResponse({
        status,
        error: { code },
      });
    }

    describe(
      'loadAdminConfig',
      (): void => {
        it(
          'gives the Google client ID',
          (): void => {
            const results: Action[] = emitted(loadAdminConfig, AdminActions.AdminConfigRequest());

            expect(results).toEqual([AdminActions.AdminConfigRequestSuccess({ googleClientId: 'client-1' })]);
          },
        );

        it(
          'says sign-in is not set up when the API says so',
          (): void => {
            adminService.getConfig = (): Observable<AdminConfigDto> =>
              throwError((): unknown => problem(ProblemCode.AdminUnavailable, 503));

            const results: Action[] = emitted(loadAdminConfig, AdminActions.AdminConfigRequest());

            expect(results).toEqual([AdminActions.AdminConfigRequestFailure({ error: AdminSignInError.Unavailable })]);
          },
        );
      },
    );

    describe(
      'signInToAdmin',
      (): void => {
        it(
          'takes the admin token to AdminTokenService and keeps only who signed in in the state',
          (): void => {
            const results: Action[] = emitted(signInToAdmin, AdminActions.AdminSignInRequest({ idToken: 'id-token' }));

            expect(TestBed.inject(AdminTokenService).getToken()).toBe('admin-jwt');
            expect(results).toEqual([
              AdminActions.AdminSignInRequestSuccess({
                session: {
                  email: 'owner@example.com',
                  name: 'Q. Testperson',
                  expiresAt: sessionDto.expiresAt,
                },
              }),
            ]);
            expect(JSON.stringify(results)).not.toContain('admin-jwt');
          },
        );

        it(
          'says a Google account that is not allowed is not authorized',
          (): void => {
            adminService.signIn = (): Observable<AdminSessionDto> =>
              throwError((): unknown => problem(ProblemCode.NotAuthorized, 403));

            const results: Action[] = emitted(signInToAdmin, AdminActions.AdminSignInRequest({ idToken: 'id-token' }));

            const failure: Action = AdminActions.AdminSignInRequestFailure({ error: AdminSignInError.NotAuthorized });
            expect(results).toEqual([failure]);
            expect(TestBed.inject(AdminTokenService).getToken()).toBeNull();
          },
        );
      },
    );

    describe(
      'openOverviewAfterSignIn',
      (): void => {
        it(
          'goes to the overview once signed in',
          (): void => {
            emitted(
              openOverviewAfterSignIn,
              AdminActions.AdminSignInRequestSuccess({
                session: {
                  email: 'owner@example.com',
                  name: 'Q. Testperson',
                  expiresAt: sessionDto.expiresAt,
                },
              }),
            );

            expect(navigations).toEqual(['/admin/overview']);
          },
        );
      },
    );

    describe(
      'leaveAdmin',
      (): void => {
        it.each([
          ['signing out', AdminActions.AdminSignOut()],
          ['the session ending', AdminActions.AdminSessionEnded()],
        ])(
          'drops the token and goes to the sign-in page on %s',
          (_name: string, action: Action): void => {
            TestBed.inject(AdminSessionStorage).start(
              'admin-jwt',
              sessionDto.expiresAt,
              'owner@example.test',
              null,
            );

            emitted(leaveAdmin, action);

            expect(TestBed.inject(AdminTokenService).getToken()).toBeNull();
            expect(navigations).toEqual(['/admin']);
          },
        );
      },
    );
  },
);
