import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
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
    (state: AdminAnnouncementsState, { items }: { items: AdminAnnouncementDto[]; }): AdminAnnouncementsState => ({
      ...state,
      items,
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
    (state: AdminAnnouncementsState, { items }: { items: AdminAnnouncementDto[]; }): AdminAnnouncementsState => ({
      ...state,
      items,
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
);
