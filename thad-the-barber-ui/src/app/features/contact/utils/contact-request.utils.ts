import { ContactRequest } from '../dtos/contact-request.dto';
import { ContactFormValue } from '../models/contact-form-value.model';
import { hasPhoneDigits, toE164 } from '../../../shared/utils/phone.utils';

/** The API rejects a field it doesn't expect, so a field the visitor left empty is left out. */
export function toContactRequest(value: ContactFormValue): ContactRequest {
  const name: string = value.name.trim();
  const email: string = value.email.trim();
  const pageOrBooking: string = value.pageOrBooking.trim();
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
  if (pageOrBooking !== '') {
    request.pageOrBooking = pageOrBooking;
  }
  return request;
}
