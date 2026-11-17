import { createAction, props } from '@ngrx/store';
import { AdminSession } from '../models/admin-session.model';
import { AdminSignInError } from '../models/admin-sign-in-error.model';

export enum AdminActionTypes {
  AdminConfigRequest = '[Admin] Config Requested',
  AdminConfigRequestSuccess = '[Admin API] Config Request Success',
  AdminConfigRequestFailure = '[Admin API] Config Request Failed',
  AdminSignInRequest = '[Admin] Sign In Requested',
  AdminSignInRequestSuccess = '[Admin API] Sign In Request Success',
  AdminSignInRequestFailure = '[Admin API] Sign In Request Failed',
  AdminSignOut = '[Admin] Signed Out',
  AdminSessionEnded = '[Admin] Session Ended',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminConfigRequest = createAction(
  AdminActionTypes.AdminConfigRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminConfigRequestSuccess = createAction(
  AdminActionTypes.AdminConfigRequestSuccess,
  props<{ googleClientId: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminConfigRequestFailure = createAction(
  AdminActionTypes.AdminConfigRequestFailure,
  props<{ error: AdminSignInError; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminSignInRequest = createAction(
  AdminActionTypes.AdminSignInRequest,
  props<{ idToken: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminSignInRequestSuccess = createAction(
  AdminActionTypes.AdminSignInRequestSuccess,
  props<{ session: AdminSession; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminSignInRequestFailure = createAction(
  AdminActionTypes.AdminSignInRequestFailure,
  props<{ error: AdminSignInError; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminSignOut = createAction(
  AdminActionTypes.AdminSignOut,
);

/** An admin call came back 401: the token expired, so the admin has to sign in again. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminSessionEnded = createAction(
  AdminActionTypes.AdminSessionEnded,
);
