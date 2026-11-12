import { AnnouncementButtonDto } from './announcement-button.dto';
import { AnnouncementImage } from '../models/announcement-image.model';

export interface AnnouncementDto {
  title: string;
  bodyHtml: string;
  startDate: string;
  endDate: string;
  image: AnnouncementImage | null;
  buttons: AnnouncementButtonDto[];
}
