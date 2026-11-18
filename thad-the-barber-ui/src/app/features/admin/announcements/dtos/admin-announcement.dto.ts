import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AnnouncementButtonVariant } from '../models/announcement-button-variant.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';

/** A picture as `GET /api/admin/announcements` returns it: the file name to save back, and where it loads from. */
export interface AdminAnnouncementImageDto {
  fileName: string;
  altText: string;
  position: AnnouncementImagePosition;
  src: string;
}

export interface AdminAnnouncementButtonDto {
  label: string;
  url: string;
  variant: AnnouncementButtonVariant;
}

/** An item of `announcements.json` whatever its dates, with its status today. */
export interface AdminAnnouncementDto {
  title: string;
  bodyHtml: string;
  startDate: string;
  endDate: string;
  image: AdminAnnouncementImageDto | null;
  buttons: AdminAnnouncementButtonDto[];
  status: AdminAnnouncementStatus;
}
