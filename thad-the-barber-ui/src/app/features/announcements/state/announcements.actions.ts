import { createAction, props } from '@ngrx/store';
import { Announcement } from '../models/announcement.model';

export enum AnnouncementsActionTypes {
  AnnouncementsRequest = '[Announcements] Announcements Requested',
  AnnouncementsRequestSuccess = '[Announcements API] Announcements Request Success',
  AnnouncementsRequestFailure = '[Announcements API] Announcements Request Failed',
  AnnouncementShown = '[Announcements] Announcement Shown',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementsRequest = createAction(
  AnnouncementsActionTypes.AnnouncementsRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementsRequestSuccess = createAction(
  AnnouncementsActionTypes.AnnouncementsRequestSuccess,
  props<{ announcements: Announcement[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementsRequestFailure = createAction(
  AnnouncementsActionTypes.AnnouncementsRequestFailure,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementShown = createAction(
  AnnouncementsActionTypes.AnnouncementShown,
  props<{ index: number; }>(),
);
