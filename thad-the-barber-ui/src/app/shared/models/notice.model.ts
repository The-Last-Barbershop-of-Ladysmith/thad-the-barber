import { NoticeSeverity } from './notice-severity.model';

/** An inline message `NoticeMessage` shows: a success, or a problem such as one mapped from the API's error `code`. */
export interface Notice {
  severity: NoticeSeverity;
  title?: string;
  text: string;
  canRetry: boolean;
}
