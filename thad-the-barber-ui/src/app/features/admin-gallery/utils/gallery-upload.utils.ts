import { GalleryUploadProblem } from '../models/gallery-upload-problem.model';

/** The largest photo the API accepts, in bytes. */
export const MAX_PHOTO_BYTES: number = 8 * 1024 * 1024;

/** The longest description the API accepts. */
export const MAX_ALT_TEXT_LENGTH: number = 100;

export const ACCEPTED_PHOTO_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

/**
 * What stops this photo and description from being sent, or null when they can go. The API checks the file's real
 * bytes again; this only spares a round trip for the common mistakes. The description becomes the photo's file name,
 * so it needs at least one letter or number (A to Z, 0 to 9).
 */
export function findUploadProblem(file: File | null, altText: string): GalleryUploadProblem | null {
  if (file === null) {
    return GalleryUploadProblem.NoFile;
  }
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return GalleryUploadProblem.NotAnImage;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return GalleryUploadProblem.TooBig;
  }
  const words: string = altText.trim();
  // The API makes the file name from the description's ASCII letters and numbers (accents dropped), like this.
  if (words.length > MAX_ALT_TEXT_LENGTH || !/[a-z0-9]/i.test(words.normalize('NFD'))) {
    return GalleryUploadProblem.NoDescription;
  }
  return null;
}
