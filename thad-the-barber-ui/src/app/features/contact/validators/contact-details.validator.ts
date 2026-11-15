import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ContactCategory } from '../../../shared/models/contact-category.model';
import { ContactFormValue } from '../models/contact-form-value.model';

/**
 * A question or an issue needs a name and a way to reply (an email or a phone); an issue also needs the page or
 * booking involved. Feedback may be anonymous.
 */
export const contactDetailsValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
  const value: ContactFormValue = form.getRawValue() as ContactFormValue;
  const isAnonymousAllowed: boolean = value.category === ContactCategory.Feedback;
  const hasName: boolean = value.name.trim() !== '';
  const hasWayToReply: boolean = value.email.trim() !== '' || /\d/.test(value.phone);
  const hasContact: boolean = isAnonymousAllowed || (hasName && hasWayToReply);
  const hasContext: boolean = value.category !== ContactCategory.Issue || value.pageOrBooking.trim() !== '';
  const isComplete: boolean = hasContact && hasContext;
  if (isComplete) {
    return null;
  }
  return { contactDetails: true };
};
