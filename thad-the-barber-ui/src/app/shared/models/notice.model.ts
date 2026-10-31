import { NoticeSeverity } from './notice-severity.model';

/** A message the booking page shows inline: a booking made, or a problem mapped from the API's error `code`. */
export interface BookingNotice {
  severity: NoticeSeverity;
  title?: string;
  text: string;
  canRetry: boolean;
}
