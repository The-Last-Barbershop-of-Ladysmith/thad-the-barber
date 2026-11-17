import { createAction, props } from '@ngrx/store';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../models/admin-gallery-error.model';

export enum AdminGalleryActionTypes {
  AdminGalleryRequest = '[Admin Gallery] Requested',
  AdminGalleryRequestSuccess = '[Admin Gallery API] Request Success',
  AdminGalleryRequestFailure = '[Admin Gallery API] Request Failed',
  AdminGalleryUpload = '[Admin Gallery] Upload Requested',
  AdminGalleryUploadSuccess = '[Admin Gallery API] Upload Success',
  AdminGalleryUploadFailure = '[Admin Gallery API] Upload Failed',
  AdminGalleryDelete = '[Admin Gallery] Delete Requested',
  AdminGalleryDeleteSuccess = '[Admin Gallery API] Delete Success',
  AdminGalleryDeleteFailure = '[Admin Gallery API] Delete Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryRequest = createAction(
  AdminGalleryActionTypes.AdminGalleryRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryRequestSuccess = createAction(
  AdminGalleryActionTypes.AdminGalleryRequestSuccess,
  props<{ photos: AdminGalleryPhotoDto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryRequestFailure = createAction(
  AdminGalleryActionTypes.AdminGalleryRequestFailure,
  props<{ error: AdminGalleryError; }>(),
);

/** Sends the photo with its description; the effect uses the file and nothing keeps it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryUpload = createAction(
  AdminGalleryActionTypes.AdminGalleryUpload,
  props<{ file: File; altText: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryUploadSuccess = createAction(
  AdminGalleryActionTypes.AdminGalleryUploadSuccess,
  props<{ photo: AdminGalleryPhotoDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryUploadFailure = createAction(
  AdminGalleryActionTypes.AdminGalleryUploadFailure,
  props<{ error: AdminGalleryError; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryDelete = createAction(
  AdminGalleryActionTypes.AdminGalleryDelete,
  props<{ fileName: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryDeleteSuccess = createAction(
  AdminGalleryActionTypes.AdminGalleryDeleteSuccess,
  props<{ fileName: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminGalleryDeleteFailure = createAction(
  AdminGalleryActionTypes.AdminGalleryDeleteFailure,
  props<{ fileName: string; error: AdminGalleryError; }>(),
);
