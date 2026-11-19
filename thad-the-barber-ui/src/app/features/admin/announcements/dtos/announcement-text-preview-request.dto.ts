/** `POST /api/admin/announcement-texts/preview`: the announcement as saved, so the text can be worded. */
export interface AnnouncementTextPreviewRequestDto {
  title: string;
  bodyHtml: string | null;
  startDate: string;
}
