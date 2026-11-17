/** A gallery photo as `GET /api/admin/gallery` returns it: its file name (how it is deleted), its URL and alt text. */
export interface AdminGalleryPhotoDto {
  fileName: string;
  src: string;
  altText: string;
  uploadedAt: string;
}
