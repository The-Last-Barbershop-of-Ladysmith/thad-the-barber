import { createAction, props } from '@ngrx/store';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';

export enum AdminAnnouncementsActionTypes {
  AdminAnnouncementsRequest = '[Admin Announcements] Requested',
  AdminAnnouncementsRequestSuccess = '[Admin Announcements API] Request Success',
  AdminAnnouncementsRequestFailure = '[Admin Announcements API] Request Failed',
  AdminAnnouncementsSave = '[Admin Announcements] Save Requested',
  AdminAnnouncementsSaveSuccess = '[Admin Announcements API] Save Success',
  AdminAnnouncementsSaveFailure = '[Admin Announcements API] Save Failed',
  AdminAnnouncementsErrorDismissed = '[Admin Announcements] Error Dismissed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsRequest = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsRequestSuccess = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsRequestSuccess,
  props<{ items: AdminAnnouncementDto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsRequestFailure = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsRequestFailure,
  props<{ error: AdminAnnouncementsError; }>(),
);

/** Saves the whole list, which replaces the file. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsSave = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsSave,
  props<{ items: AnnouncementInputDto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsSaveSuccess = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsSaveSuccess,
  props<{ items: AdminAnnouncementDto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsSaveFailure = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsSaveFailure,
  props<{ error: AdminAnnouncementsError; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsErrorDismissed = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsErrorDismissed,
);
