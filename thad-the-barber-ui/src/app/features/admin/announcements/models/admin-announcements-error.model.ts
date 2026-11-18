/** What the announcements pages say went wrong, by the API's problem `code`. */
export enum AdminAnnouncementsError {
  /** The file can't be read or saved (`announcements_unavailable`). */
  Unavailable = 'unavailable',
  /** The save was refused as invalid (`validation_failed`). */
  Invalid = 'invalid',
  /** The photo was refused as an image (`invalid_image`). */
  InvalidImage = 'invalid_image',
  Failed = 'failed',
}
