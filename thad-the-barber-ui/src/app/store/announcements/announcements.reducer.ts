import { ActionReducer, createReducer, on } from '@ngrx/store';
import { Announcement } from '../../core/models/announcements/announcement.model';
import { RequestStatus } from '../../shared/models/request.models';
import * as AnnouncementsActions from './announcements.actions';
import { AnnouncementsState, initialAnnouncementsState } from './announcements.state';

export const announcementsReducer: ActionReducer<AnnouncementsState> = createReducer(
  initialAnnouncementsState,
  on(
    AnnouncementsActions.AnnouncementsRequest,
    (state: AnnouncementsState): AnnouncementsState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    AnnouncementsActions.AnnouncementsRequestSuccess,
    (state: AnnouncementsState, { announcements }: { announcements: Announcement[]; }): AnnouncementsState => ({
      ...state,
      announcements,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    AnnouncementsActions.AnnouncementsRequestFailure,
    (state: AnnouncementsState): AnnouncementsState => ({
      ...state,
      loadStatus: RequestStatus.Error,
    }),
  ),
);
