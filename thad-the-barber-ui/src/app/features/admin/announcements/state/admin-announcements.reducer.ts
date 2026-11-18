import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AdminAnnouncementImageUploadDto } from '../dtos/admin-announcement-image-upload.dto';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';
import * as AdminAnnouncementsActions from './admin-announcements.actions';
import { AdminAnnouncementsState, initialAdminAnnouncementsState } from './admin-announcements.state';

export const adminAnnouncementsReducer: ActionReducer<AdminAnnouncementsState> = createReducer(
  initialAdminAnnouncementsState,
  on(
    AdminAnnouncementsActions.AdminAnnouncementsRequest,
    (state: AdminAnnouncementsState): AdminAnnouncementsState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess,
    (
      state: AdminAnnouncementsState,
      { announcements }: { announcements: AdminAnnouncementDto[]; },
    ): AdminAnnouncementsState => ({
      ...state,
      announcements,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsRequestFailure,
    (state: AdminAnnouncementsState, { error }: { error: AdminAnnouncementsError; }): AdminAnnouncementsState => ({
      ...state,
      loadStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsSave,
    (state: AdminAnnouncementsState): AdminAnnouncementsState => ({
      ...state,
      saveStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess,
    (
      state: AdminAnnouncementsState,
      { announcements }: { announcements: AdminAnnouncementDto[]; },
    ): AdminAnnouncementsState => ({
      ...state,
      announcements,
      saveStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsSaveFailure,
    (state: AdminAnnouncementsState, { error }: { error: AdminAnnouncementsError; }): AdminAnnouncementsState => ({
      ...state,
      saveStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsErrorDismissed,
    (state: AdminAnnouncementsState): AdminAnnouncementsState => ({
      ...state,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsImageUpload,
    (state: AdminAnnouncementsState): AdminAnnouncementsState => ({
      ...state,
      imageUploadStatus: RequestStatus.Pending,
      uploadedImage: null,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsImageUploadSuccess,
    (
      state: AdminAnnouncementsState,
      { image }: { image: AdminAnnouncementImageUploadDto; },
    ): AdminAnnouncementsState => ({
      ...state,
      imageUploadStatus: RequestStatus.Success,
      uploadedImage: image,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsImageUploadFailure,
    (state: AdminAnnouncementsState, { error }: { error: AdminAnnouncementsError; }): AdminAnnouncementsState => ({
      ...state,
      imageUploadStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminAnnouncementsActions.AdminAnnouncementsImageTaken,
    (state: AdminAnnouncementsState): AdminAnnouncementsState => ({
      ...state,
      imageUploadStatus: RequestStatus.Idle,
      uploadedImage: null,
    }),
  ),
);
