/** `POST /api/admin/announcements/images`: the stored file's name to save with the announcement, and its URL. */
export interface AdminAnnouncementImageUploadDto {
  fileName: string;
  src: string;
}
