import { ContactCategory } from './contact-category.model';

export interface ContactFormValue {
  category: ContactCategory;
  message: string;
  name: string;
  email: string;
  phone: string;
  pageOrBooking: string;
}
