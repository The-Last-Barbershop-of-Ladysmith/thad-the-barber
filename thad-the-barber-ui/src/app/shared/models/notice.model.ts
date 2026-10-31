import { NoticeSeverity } from './notice-severity.model';

/** A link inside a notice to another page of the app (`path` is a router path). */
interface NoticeLink {
  label: string;
  path: string;
}

/** An inline message `NoticeMessage` shows: a success, or a problem such as one mapped from the API's error `code`. */
export interface Notice {
  severity: NoticeSeverity;
  title?: string;
  text: string;
  link?: NoticeLink;
  canRetry: boolean;
}
