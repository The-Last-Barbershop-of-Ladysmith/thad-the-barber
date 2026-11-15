import { ContactRequest } from '../dtos/contact-request.dto';
import { ContactCategory } from '../../../shared/models/contact-category.model';
import { ContactFormValue } from '../models/contact-form-value.model';
import { hasPhoneDigits, toE164 } from '../../../shared/utils/phone.utils';

/**
 * The API rejects a field it doesn't expect, so a field the visitor left empty is left out, and so is the page or
 * booking of a message that isn't a problem report, where the form no longer shows it.
 */
export function toContactRequest(value: ContactFormValue): ContactRequest {
  const name: string = value.name.trim();
  const email: string = value.email.trim();
  const pageOrBooking: string = value.pageOrBooking.trim();
  const isPageOrBookingShown: boolean = value.category === ContactCategory.Issue;
  const request: ContactRequest = {
    category: value.category,
    message: value.message.trim(),
  };
  if (name !== '') {
    request.name = name;
  }
  if (email !== '') {
    request.email = email;
  }
  if (hasPhoneDigits(value.phone)) {
    request.phone = toE164(value.phone);
  }
  if (isPageOrBookingShown && pageOrBooking !== '') {
    request.pageOrBooking = pageOrBooking;
  }
  return request;
}
