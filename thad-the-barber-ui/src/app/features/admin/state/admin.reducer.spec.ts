import { RequestStatus } from '../../../shared/models/request.models';
import { AdminSession } from '../models/admin-session.model';
import { AdminSignInError } from '../models/admin-sign-in-error.model';
import * as AdminActions from './admin.actions';
import { adminReducer } from './admin.reducer';
import { AdminState, initialAdminState } from './admin.state';

describe(
  'adminReducer',
  (): void => {
    const session: AdminSession = {
      email: 'owner@example.com',
      name: 'Q. Testperson',
      expiresAt: '2031-02-28T12:30:00Z',
    };
    const signedIn: AdminState = {
      ...initialAdminState,
      session,
      signInStatus: RequestStatus.Success,
    };

    it(
      'starts signed out with nothing loaded',
      (): void => {
        expect(adminReducer(undefined, { type: 'unknown' })).toEqual(initialAdminState);
      },
    );

    it(
      'tracks the config request',
      (): void => {
        const pending: AdminState = adminReducer(initialAdminState, AdminActions.AdminConfigRequest());
        const loaded: AdminState = adminReducer(pending, AdminActions.AdminConfigRequestSuccess({ googleClientId: 'client-1' }));

        expect(pending.configStatus).toBe(RequestStatus.Pending);
        expect(loaded.configStatus).toBe(RequestStatus.Success);
        expect(loaded.googleClientId).toBe('client-1');
      },
    );

    it(
      'says why the config could not be loaded',
      (): void => {
        const failed: AdminState = adminReducer(
          initialAdminState,
          AdminActions.AdminConfigRequestFailure({ error: AdminSignInError.Unavailable }),
        );

        expect(failed.configStatus).toBe(RequestStatus.Error);
        expect(failed.signInError).toBe(AdminSignInError.Unavailable);
      },
    );

    it(
      'clears an earlier problem when a new sign-in starts, then holds who signed in',
      (): void => {
        const failed: AdminState = {
          ...initialAdminState,
          signInError: AdminSignInError.NotAuthorized,
        };

        const pending: AdminState = adminReducer(failed, AdminActions.AdminSignInRequest({ idToken: 'id-token' }));
        const done: AdminState = adminReducer(pending, AdminActions.AdminSignInRequestSuccess({ session }));

        expect(pending.signInStatus).toBe(RequestStatus.Pending);
        expect(pending.signInError).toBeNull();
        expect(done.session).toEqual(session);
        expect(done.signInStatus).toBe(RequestStatus.Success);
      },
    );

    it(
      'keeps the reason a sign-in failed',
      (): void => {
        const failed: AdminState = adminReducer(
          initialAdminState,
          AdminActions.AdminSignInRequestFailure({ error: AdminSignInError.NotAuthorized }),
        );

        expect(failed.signInStatus).toBe(RequestStatus.Error);
        expect(failed.signInError).toBe(AdminSignInError.NotAuthorized);
        expect(failed.session).toBeNull();
      },
    );

    it(
      'forgets who was signed in on sign out, with no problem to show',
      (): void => {
        const out: AdminState = adminReducer(signedIn, AdminActions.AdminSignOut());

        expect(out.session).toBeNull();
        expect(out.signInStatus).toBe(RequestStatus.Idle);
        expect(out.signInError).toBeNull();
      },
    );

    it(
      'forgets who was signed in when the session ends, and says it ended',
      (): void => {
        const ended: AdminState = adminReducer(signedIn, AdminActions.AdminSessionEnded());

        expect(ended.session).toBeNull();
        expect(ended.signInError).toBe(AdminSignInError.SessionEnded);
      },
    );
  },
);
