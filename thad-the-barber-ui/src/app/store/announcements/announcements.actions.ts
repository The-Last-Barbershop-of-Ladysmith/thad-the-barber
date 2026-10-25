import { createAction, props } from '@ngrx/store';
import { Announcement } from '../../core/models/announcements/announcement.model';

export enum AnnouncementsActionTypes {
  AnnouncementsRequest = '[Announcements] Announcements Requested',
  AnnouncementsRequestSuccess = '[Announcements API] Announcements Request Success',
  AnnouncementsRequestFailure = '[Announcements API] Announcements Request Failed',
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
