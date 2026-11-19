import { createAction, props } from '@ngrx/store';

export enum HomeActionTypes {
  HomePageOpen = '[Home Page] Opened',
  HomePageClose = '[Home Page] Closed',
  NextTimesRequestSuccess = '[Home API] Next Times Loaded',
  NextTimesRequestFailure = '[Home API] Next Times Load Failed',
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
