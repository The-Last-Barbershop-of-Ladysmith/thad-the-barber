import { RequestStatus } from '../../../shared/models/request.models';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../models/admin-gallery-error.model';

export interface AdminGalleryState {
  photos: AdminGalleryPhotoDto[];
  loadStatus: RequestStatus;
  uploadStatus: RequestStatus;
  deleteStatus: RequestStatus;
  error: AdminGalleryError | null;
}

export const initialAdminGalleryState: AdminGalleryState = {
  photos: [],
  loadStatus: RequestStatus.Idle,
  uploadStatus: RequestStatus.Idle,
  deleteStatus: RequestStatus.Idle,
  error: null,
};
