import { ContactCategory } from './contact-category.model';

/** The router's navigation state when another page sends the visitor here to report a problem. */
export interface ContactPrefill {
  category: ContactCategory;
  pageOrBooking: string;
}
