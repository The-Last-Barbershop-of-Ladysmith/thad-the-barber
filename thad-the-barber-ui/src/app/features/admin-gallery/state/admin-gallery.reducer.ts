import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../models/admin-gallery-error.model';
import * as AdminGalleryActions from './admin-gallery.actions';
import { AdminGalleryState, initialAdminGalleryState } from './admin-gallery.state';

export const adminGalleryReducer: ActionReducer<AdminGalleryState> = createReducer(
  initialAdminGalleryState,
  on(
    AdminGalleryActions.AdminGalleryRequest,
    (state: AdminGalleryState): AdminGalleryState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
      uploadStatus: RequestStatus.Idle,
      deleteStatus: RequestStatus.Idle,
      error: null,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryRequestSuccess,
    (state: AdminGalleryState, { photos }: { photos: AdminGalleryPhotoDto[]; }): AdminGalleryState => ({
      ...state,
      photos,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryRequestFailure,
    (state: AdminGalleryState, { error }: { error: AdminGalleryError; }): AdminGalleryState => ({
      ...state,
      loadStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryUpload,
    (state: AdminGalleryState): AdminGalleryState => ({
      ...state,
      uploadStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryUploadSuccess,
    (state: AdminGalleryState, { photo }: { photo: AdminGalleryPhotoDto; }): AdminGalleryState => ({
      ...state,
      photos: [photo, ...state.photos],
      uploadStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryUploadFailure,
    (state: AdminGalleryState, { error }: { error: AdminGalleryError; }): AdminGalleryState => ({
      ...state,
      uploadStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryDelete,
    (state: AdminGalleryState): AdminGalleryState => ({
      ...state,
      deleteStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryDeleteSuccess,
    (state: AdminGalleryState, { fileName }: { fileName: string; }): AdminGalleryState => ({
      ...state,
      photos: state.photos.filter((photo: AdminGalleryPhotoDto): boolean => photo.fileName !== fileName),
      deleteStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminGalleryActions.AdminGalleryDeleteFailure,
    (
      state: AdminGalleryState,
      { fileName, error }: { fileName: string; error: AdminGalleryError; },
    ): AdminGalleryState => ({
      ...state,
      // A photo that was already gone is gone from the page too.
      photos: error === AdminGalleryError.NotFound
        ? state.photos.filter((photo: AdminGalleryPhotoDto): boolean => photo.fileName !== fileName)
        : state.photos,
      deleteStatus: RequestStatus.Error,
      error,
    }),
  ),
);
