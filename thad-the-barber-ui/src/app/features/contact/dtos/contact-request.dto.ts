import { ContactCategory } from '../models/contact-category.model';

export interface ContactRequest {
  category: ContactCategory;
  message: string;
  name?: string;
  email?: string;
  phone?: string;
  pageOrBooking?: string;
}
