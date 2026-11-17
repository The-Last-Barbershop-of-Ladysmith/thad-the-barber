import { RequestStatus } from '../../../shared/models/request.models';
import { AdminAnnouncementImageUploadDto } from '../dtos/admin-announcement-image-upload.dto';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';

export interface AdminAnnouncementsState {
  items: AdminAnnouncementDto[];
  loadStatus: RequestStatus;
  saveStatus: RequestStatus;
  imageUploadStatus: RequestStatus;
  /** The photo just stored for the form to take; the form clears it once it has. */
  uploadedImage: AdminAnnouncementImageUploadDto | null;
  error: AdminAnnouncementsError | null;
}

export const initialAdminAnnouncementsState: AdminAnnouncementsState = {
  items: [],
  loadStatus: RequestStatus.Idle,
  saveStatus: RequestStatus.Idle,
  imageUploadStatus: RequestStatus.Idle,
  uploadedImage: null,
  error: null,
};
