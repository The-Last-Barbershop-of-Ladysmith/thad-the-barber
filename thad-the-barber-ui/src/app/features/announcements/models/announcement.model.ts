import { AnnouncementButton } from './announcement-button.model';
import { AnnouncementImage } from './announcement-image.model';

/** An item of `content/announcements.json` in the media container, checked and ready to show. */
export interface Announcement {
  title: string;
  /** Rich text from Thad (later the admin portal's editor); Angular's sanitizer cleans it when it renders. */
  bodyHtml: string;
  /** First day it shows, `YYYY-MM-DD`. */
  startDate: string;
  /** Last day it shows, `YYYY-MM-DD`. */
  endDate: string;
  image: AnnouncementImage | null;
  buttons: AnnouncementButton[];
}
