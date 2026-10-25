import { Announcement } from '../../core/models/announcements/announcement.model';
import { RequestStatus } from '../../shared/models/request.models';

export interface AnnouncementsState {
  announcements: Announcement[];
  loadStatus: RequestStatus;
}

export const initialAnnouncementsState: AnnouncementsState = {
  announcements: [],
  loadStatus: RequestStatus.Idle,
};
