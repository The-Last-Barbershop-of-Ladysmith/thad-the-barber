import { AnnouncementImagePosition } from '../models/announcement-image-position.model';

export interface AnnouncementImageDto {
  src: string;
  alt: string;
  position: AnnouncementImagePosition;
}
