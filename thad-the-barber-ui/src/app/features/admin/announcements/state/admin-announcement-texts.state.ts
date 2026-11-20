import { RequestStatus } from '../../../../shared/models/request.models';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AnnouncementTextError } from '../models/announcement-text-error.model';

export interface AdminAnnouncementTextsState {
  preview: AnnouncementTextPreviewDto | null;
  previewStatus: RequestStatus;
  sendStatus: RequestStatus;
  sent: AnnouncementTextStatusDto | null;
  error: AnnouncementTextError | null;
}

export const initialAdminAnnouncementTextsState: AdminAnnouncementTextsState = {
  preview: null,
  previewStatus: RequestStatus.Idle,
  sendStatus: RequestStatus.Idle,
  sent: null,
  error: null,
};
