import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';

/** What the announcements pages say for a failed call, in words the owner can act on. */
export function toAnnouncementsMessage(error: AdminAnnouncementsError): string {
  switch (error) {
    case AdminAnnouncementsError.Unavailable:
      return 'The announcements file could not be reached. Nothing was changed. Try again in a minute.';
    case AdminAnnouncementsError.Invalid:
      return 'Something in that announcement was not accepted. Check the title, the dates, the picture and the button links.';
    case AdminAnnouncementsError.InvalidImage:
      return 'That file could not be used. Use a JPEG, PNG, WebP or AVIF photo under 8 MB.';
    case AdminAnnouncementsError.Failed:
      return 'That did not work. Nothing was changed. Try again.';
  }
}
