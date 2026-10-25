import { NoticeFallback } from './notice-fallback.model';
import { NoticeSeverity } from './notice-severity.model';

/** A message the booking page shows inline, mapped from the API's error `code`, never its raw text. */
export interface BookingNotice {
  severity: NoticeSeverity;
  text: string;
  fallback: NoticeFallback;
  canRetry: boolean;
}
