import { ANNOUNCEMENTS_PATH } from '../config/announcements-paths';

/** The page that shows what will be texted and asks to send it, for the announcement with this title and first day. */
export function announcementTextPath(title: string, startDate: string): string {
  return `${ANNOUNCEMENTS_PATH}/text?title=${encodeURIComponent(title)}&startDate=${startDate}`;
}
