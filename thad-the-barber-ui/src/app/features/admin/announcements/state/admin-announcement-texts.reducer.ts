import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AnnouncementTextError } from '../models/announcement-text-error.model';
import * as AdminAnnouncementTextsActions from './admin-announcement-texts.actions';
import { AdminAnnouncementTextsState, initialAdminAnnouncementTextsState } from './admin-announcement-texts.state';

export const adminAnnouncementTextsReducer: ActionReducer<AdminAnnouncementTextsState> = createReducer(
  initialAdminAnnouncementTextsState,
  on(
    AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest,
    (state: AdminAnnouncementTextsState): AdminAnnouncementTextsState => ({
      ...state,
      previewStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess,
    (
      state: AdminAnnouncementTextsState,
      { preview }: { preview: AnnouncementTextPreviewDto; },
    ): AdminAnnouncementTextsState => ({
      ...state,
      preview,
      previewStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestFailure,
    (
      state: AdminAnnouncementTextsState,
      { error }: { error: AnnouncementTextError; },
    ): AdminAnnouncementTextsState => ({
      ...state,
      previewStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextSend,
    (state: AdminAnnouncementTextsState): AdminAnnouncementTextsState => ({
      ...state,
      sendStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextSendSuccess,
    (
      state: AdminAnnouncementTextsState,
      { status }: { status: AnnouncementTextStatusDto; },
    ): AdminAnnouncementTextsState => ({
      ...state,
      sendStatus: RequestStatus.Success,
      sent: status,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextSendFailure,
    (
      state: AdminAnnouncementTextsState,
      { error }: { error: AnnouncementTextError; },
    ): AdminAnnouncementTextsState => ({
      ...state,
      sendStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminAnnouncementTextsActions.AnnouncementTextReset,
    (): AdminAnnouncementTextsState => initialAdminAnnouncementTextsState,
  ),
);
