import { Announcement } from '../models/announcement.model';
import { RequestStatus } from '../../../shared/models/request.models';

export interface AnnouncementsState {
  announcements: Announcement[];
  loadStatus: RequestStatus;
  /** Which announcement the carousel is on, counted in newest-first order; the strip's link sets it. */
  shownIndex: number;
}

export const initialAnnouncementsState: AnnouncementsState = {
  announcements: [],
  loadStatus: RequestStatus.Idle,
  shownIndex: 0,
};
