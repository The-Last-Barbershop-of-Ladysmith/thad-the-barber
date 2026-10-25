import { createAction, props } from '@ngrx/store';
import { Announcement } from '../../../core/models/announcements/announcement.model';
import { GalleryPhoto, HomeContent } from '../models/home.models';

export enum HomeActionTypes {
  /** Clears the slice back to its initial state (also overwrites its saved copy). */
  HomeStateReset = '[Home Page] State Reset',
  HomePageOpen = '[Home Page] Opened',
  SmsSignupRequest = '[Home Page] Sms Signup Submitted',
  HomeContentRequestSuccess = '[Home API] Content Loaded',
  HomeContentRequestFailure = '[Home API] Content Load Failed',
  AnnouncementsRequestSuccess = '[Home API] Announcements Loaded',
  AnnouncementsRequestFailure = '[Home API] Announcements Load Failed',
  GalleryRequestSuccess = '[Home API] Gallery Loaded',
  GalleryRequestFailure = '[Home API] Gallery Load Failed',
  SmsSignupRequestSuccess = '[Home API] Sms Signup Succeeded',
  SmsSignupRequestFailure = '[Home API] Sms Signup Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomeStateReset = createAction(
  HomeActionTypes.HomeStateReset,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomePageOpen = createAction(
  HomeActionTypes.HomePageOpen,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SmsSignupRequest = createAction(
  HomeActionTypes.SmsSignupRequest,
  props<{ phone: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomeContentRequestSuccess = createAction(
  HomeActionTypes.HomeContentRequestSuccess,
  props<{ content: HomeContent; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const HomeContentRequestFailure = createAction(
  HomeActionTypes.HomeContentRequestFailure,
  props<{ error: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementsRequestSuccess = createAction(
  HomeActionTypes.AnnouncementsRequestSuccess,
  props<{ announcements: Announcement[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementsRequestFailure = createAction(
  HomeActionTypes.AnnouncementsRequestFailure,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const GalleryRequestSuccess = createAction(
  HomeActionTypes.GalleryRequestSuccess,
  props<{ photos: GalleryPhoto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const GalleryRequestFailure = createAction(
  HomeActionTypes.GalleryRequestFailure,
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
