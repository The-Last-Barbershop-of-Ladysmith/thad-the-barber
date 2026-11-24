/** `POST /api/admin/announcement-texts`: texts the announcement to the subscribers with exactly this message. */
export interface AnnouncementTextRequestDto {
  title: string;
  startDate: string;
  message: string;
}
