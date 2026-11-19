import { AnnouncementTextStatusDto } from './announcement-text-status.dto';

/** The suggested wording, who would get it, and whether texting is on, waits for the first day, or was already done. */
export interface AnnouncementTextPreviewDto {
  message: string;
  subscriberCount: number;
  isEnabled: boolean;
  isScheduled: boolean;
  alreadyTexted: AnnouncementTextStatusDto | null;
}
