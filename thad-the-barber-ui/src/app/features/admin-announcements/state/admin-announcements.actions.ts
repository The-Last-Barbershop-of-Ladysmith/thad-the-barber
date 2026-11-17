import { createAction, props } from '@ngrx/store';
import { AdminAnnouncementImageUploadDto } from '../dtos/admin-announcement-image-upload.dto';
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
  AdminAnnouncementsImageUpload = '[Admin Announcements] Image Upload Requested',
  AdminAnnouncementsImageUploadSuccess = '[Admin Announcements API] Image Upload Success',
  AdminAnnouncementsImageUploadFailure = '[Admin Announcements API] Image Upload Failed',
  AdminAnnouncementsImageTaken = '[Admin Announcements] Uploaded Image Taken',
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

/** Sends a photo for an announcement; the effect uses the file and nothing keeps it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsImageUpload = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsImageUpload,
  props<{ file: File; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsImageUploadSuccess = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsImageUploadSuccess,
  props<{ image: AdminAnnouncementImageUploadDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsImageUploadFailure = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsImageUploadFailure,
  props<{ error: AdminAnnouncementsError; }>(),
);

/** The form has put the uploaded photo on the announcement, so it is no longer waiting. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminAnnouncementsImageTaken = createAction(
  AdminAnnouncementsActionTypes.AdminAnnouncementsImageTaken,
);
