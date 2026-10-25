import { AnnouncementImagePosition } from './announcement-image-position.model';

export interface AnnouncementImage {
  src: string;
  /** Empty when Thad gives no alt text, so screen readers skip the image. */
  alt: string;
  position: AnnouncementImagePosition;
}
