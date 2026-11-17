import { RequestStatus } from '../../../shared/models/request.models';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';

export interface AdminAnnouncementsState {
  items: AdminAnnouncementDto[];
  loadStatus: RequestStatus;
  saveStatus: RequestStatus;
  error: AdminAnnouncementsError | null;
}

export const initialAdminAnnouncementsState: AdminAnnouncementsState = {
  items: [],
  loadStatus: RequestStatus.Idle,
  saveStatus: RequestStatus.Idle,
  error: null,
};
