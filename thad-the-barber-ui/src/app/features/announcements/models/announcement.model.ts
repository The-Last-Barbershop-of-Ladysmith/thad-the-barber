import { Button } from '../../../shared/models/button.models';
import { AnnouncementImage } from './announcement-image.model';

export interface Announcement {
  title: string;
  /** Rich text from Thad (later the admin portal's editor); Angular's sanitizer cleans it when it renders. */
  bodyHtml: string;
  /** First day it shows, `YYYY-MM-DD`. */
  startDate: string;
  /** Last day it shows, `YYYY-MM-DD`. */
  endDate: string;
  image: AnnouncementImage | null;
  buttons: Button[];
}
