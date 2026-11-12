import { AnnouncementButtonDto } from './announcement-button.dto';
import { AnnouncementImageDto } from './announcement-image.dto';

export interface AnnouncementDto {
  title: string;
  bodyHtml: string;
  startDate: string;
  endDate: string;
  image: AnnouncementImageDto | null;
  buttons: AnnouncementButtonDto[];
}
