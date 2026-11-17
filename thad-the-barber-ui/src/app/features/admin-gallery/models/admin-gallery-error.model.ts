/** What the gallery page says went wrong, by the API's problem `code`. */
export enum AdminGalleryError {
  /** The gallery folder can't be read or changed (`gallery_unavailable`). */
  Unavailable = 'unavailable',
  /** The file was refused as an image (`invalid_image`). */
  InvalidImage = 'invalid_image',
  /** The photo was already gone (`photo_not_found`). */
  NotFound = 'not_found',
  Failed = 'failed',
}
