import { RequestStatus } from '../../../shared/models/request.models';
import { GalleryPhoto } from '../models/gallery-photo.model';

export interface GalleryState {
  photos: GalleryPhoto[];
  loadStatus: RequestStatus;
}

export const initialGalleryState: GalleryState = {
  photos: [],
  loadStatus: RequestStatus.Idle,
};
