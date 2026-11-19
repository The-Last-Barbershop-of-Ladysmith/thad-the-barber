import { AnnouncementSendState } from '../models/announcement-send-state.model';

/** Where an announcement's text stands, from `POST` and `GET /api/admin/announcement-texts`. */
export interface AnnouncementTextStatusDto {
  id: string;
  state: AnnouncementSendState;
  /** The day it goes out, as `yyyy-MM-dd` on the shop's calendar. */
  sendOn: string;
  total: number;
  sentCount: number;
  failedCount: number;
}
