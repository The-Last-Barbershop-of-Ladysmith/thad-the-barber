import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AdminSession } from '../models/admin-session.model';
import { AdminSignInError } from '../models/admin-sign-in-error.model';
import * as AdminActions from './admin.actions';
import { AdminState, initialAdminState } from './admin.state';

export const adminReducer: ActionReducer<AdminState> = createReducer(
  initialAdminState,
  on(
    AdminActions.AdminConfigRequest,
    (state: AdminState): AdminState => ({
      ...state,
      configStatus: RequestStatus.Pending,
    }),
  ),
  on(
    AdminActions.AdminConfigRequestSuccess,
    (state: AdminState, { googleClientId }: { googleClientId: string; }): AdminState => ({
      ...state,
      googleClientId,
      configStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminActions.AdminConfigRequestFailure,
    (state: AdminState, { error }: { error: AdminSignInError; }): AdminState => ({
      ...state,
      configStatus: RequestStatus.Error,
      signInError: error,
    }),
  ),
  on(
    AdminActions.AdminSignInRequest,
    (state: AdminState): AdminState => ({
      ...state,
      signInStatus: RequestStatus.Pending,
      signInError: null,
    }),
  ),
  on(
    AdminActions.AdminSignInRequestSuccess,
    (state: AdminState, { session }: { session: AdminSession; }): AdminState => ({
      ...state,
      session,
      signInStatus: RequestStatus.Success,
      signInError: null,
    }),
  ),
  on(
    AdminActions.AdminSignInRequestFailure,
    (state: AdminState, { error }: { error: AdminSignInError; }): AdminState => ({
      ...state,
      signInStatus: RequestStatus.Error,
      signInError: error,
    }),
  ),
  on(
    AdminActions.AdminSignOut,
    (state: AdminState): AdminState => ({
      ...state,
      session: null,
      signInStatus: RequestStatus.Idle,
      signInError: null,
    }),
  ),
  on(
    AdminActions.AdminSessionEnded,
    (state: AdminState): AdminState => ({
      ...state,
      session: null,
      signInStatus: RequestStatus.Idle,
      signInError: AdminSignInError.SessionEnded,
    }),
  ),
);
