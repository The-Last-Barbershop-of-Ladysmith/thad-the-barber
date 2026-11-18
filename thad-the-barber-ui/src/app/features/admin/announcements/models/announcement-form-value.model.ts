import { AdminAnnouncementButtonDto } from '../dtos/admin-announcement.dto';
import { AnnouncementImagePosition } from './announcement-image-position.model';

/** What the edit form holds: the message as typed (not HTML) and the picture's description and side. */
export interface AnnouncementFormValue {
  title: string;
  message: string;
  startDate: string;
  endDate: string;
  imageAltText: string;
  imagePosition: AnnouncementImagePosition;
  buttons: AdminAnnouncementButtonDto[];
}
