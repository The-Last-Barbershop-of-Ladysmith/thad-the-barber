/** What the announcement text page says went wrong, by the API's problem `code`. */
export enum AnnouncementTextError {
  /** Texting is switched off, or the text couldn't be saved (`texts_unavailable`). */
  Unavailable = 'unavailable',
  /** This announcement was already texted or scheduled (`already_texted`). */
  AlreadyTexted = 'already_texted',
  /** The message was refused as invalid (`validation_failed`). */
  Invalid = 'invalid',
  Failed = 'failed',
}
