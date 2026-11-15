import { ContactRequest } from '../dtos/contact-request.dto';
import { ContactFormValue } from '../models/contact-form-value.model';
import { toE164 } from '../../../shared/utils/phone.utils';

/** The API rejects a field it doesn't expect, so a field the visitor left empty is left out. */
export function toContactRequest(value: ContactFormValue): ContactRequest {
  const request: ContactRequest = {
    category: value.category,
    message: value.message.trim(),
  };
  if (value.name.trim() !== '') {
    request.name = value.name.trim();
  }
  if (value.email.trim() !== '') {
    request.email = value.email.trim();
  }
  if (/\d/.test(value.phone)) {
    request.phone = toE164(value.phone);
  }
  if (value.pageOrBooking.trim() !== '') {
    request.pageOrBooking = value.pageOrBooking.trim();
  }
  return request;
}
