import { AdminAnnouncementButtonDto } from './admin-announcement.dto';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';

export interface AnnouncementInputImageDto {
  fileName: string;
  altText: string;
  position: AnnouncementImagePosition;
}

/** One announcement to save, in the file's own shape (no status, no picture URL). */
export interface AnnouncementInputDto {
  title: string;
  bodyHtml: string;
  startDate: string;
  endDate: string;
  image: AnnouncementInputImageDto | null;
  buttons: AdminAnnouncementButtonDto[];
}

/** `PUT /api/admin/announcements`: the whole list, which replaces the file. */
export interface AnnouncementsSaveRequestDto {
  items: AnnouncementInputDto[];
}
