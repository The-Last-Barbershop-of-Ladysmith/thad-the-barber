import { createAction, props } from '@ngrx/store';

export enum HomeActionTypes {
  HomePageOpen = '[Home Page] Opened',
  HomePageClose = '[Home Page] Closed',
  SmsSignupRequest = '[Home Page] Sms Signup Submitted',
  NextTimesRequestSuccess = '[Home API] Next Times Loaded',
  NextTimesRequestFailure = '[Home API] Next Times Load Failed',
  SmsSignupRequestSuccess = '[Home API] Sms Signup Succeeded',
  SmsSignupRequestFailure = '[Home API] Sms Signup Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomePageOpen = createAction(
  HomeActionTypes.HomePageOpen,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomePageClose = createAction(
  HomeActionTypes.HomePageClose,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const NextTimesRequestSuccess = createAction(
  HomeActionTypes.NextTimesRequestSuccess,
  props<{ startAts: string[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const NextTimesRequestFailure = createAction(
  HomeActionTypes.NextTimesRequestFailure,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SmsSignupRequest = createAction(
  HomeActionTypes.SmsSignupRequest,
  props<{ phone: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SmsSignupRequestSuccess = createAction(
  HomeActionTypes.SmsSignupRequestSuccess,
  props<{ phone: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SmsSignupRequestFailure = createAction(
  HomeActionTypes.SmsSignupRequestFailure,
  props<{ error: string; }>(),
);
