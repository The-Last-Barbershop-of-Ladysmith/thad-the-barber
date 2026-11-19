import { createAction, props } from '@ngrx/store';
import { AnnouncementTextPreviewRequestDto } from '../dtos/announcement-text-preview-request.dto';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextRequestDto } from '../dtos/announcement-text-request.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AnnouncementTextError } from '../models/announcement-text-error.model';

export enum AdminAnnouncementTextsActionTypes {
  AnnouncementTextPreviewRequest = '[Admin Announcement Texts] Preview Requested',
  AnnouncementTextPreviewRequestSuccess = '[Admin Announcement Texts API] Preview Success',
  AnnouncementTextPreviewRequestFailure = '[Admin Announcement Texts API] Preview Failed',
  AnnouncementTextSend = '[Admin Announcement Texts] Send Requested',
  AnnouncementTextSendSuccess = '[Admin Announcement Texts API] Send Success',
  AnnouncementTextSendFailure = '[Admin Announcement Texts API] Send Failed',
  AnnouncementTextReset = '[Admin Announcement Texts] Reset',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextPreviewRequest = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextPreviewRequest,
  props<{ request: AnnouncementTextPreviewRequestDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextPreviewRequestSuccess = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextPreviewRequestSuccess,
  props<{ preview: AnnouncementTextPreviewDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextPreviewRequestFailure = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextPreviewRequestFailure,
  props<{ error: AnnouncementTextError; }>(),
);

/** Texts the announcement to the subscribers with exactly this message; they go out in the background. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextSend = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextSend,
  props<{ request: AnnouncementTextRequestDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextSendSuccess = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextSendSuccess,
  props<{ status: AnnouncementTextStatusDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextSendFailure = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextSendFailure,
  props<{ error: AnnouncementTextError; }>(),
);

/** The page was left, so the next announcement starts from nothing. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AnnouncementTextReset = createAction(
  AdminAnnouncementTextsActionTypes.AnnouncementTextReset,
);
