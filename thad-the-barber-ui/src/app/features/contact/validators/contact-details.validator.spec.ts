import { FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { ContactCategory } from '../models/contact-category.model';
import { ContactFormValue } from '../models/contact-form-value.model';
import { contactDetailsValidator } from './contact-details.validator';

const COMPLETE_ISSUE: ContactFormValue = {
  category: ContactCategory.Issue,
  message: 'Made-up message',
  name: 'Fake Person',
  email: 'fake.person@example.test',
  phone: '',
  pageOrBooking: '/book',
};

function check(value: ContactFormValue): ValidationErrors | null {
  return contactDetailsValidator(new FormGroup({
    category: new FormControl(value.category),
    message: new FormControl(value.message),
    name: new FormControl(value.name),
    email: new FormControl(value.email),
    phone: new FormControl(value.phone),
    pageOrBooking: new FormControl(value.pageOrBooking),
  }));
}

describe(
  'contactDetailsValidator',
  (): void => {
    it(
      'accepts anonymous feedback',
      (): void => {
        expect(check({
          ...COMPLETE_ISSUE,
          category: ContactCategory.Feedback,
          name: '',
          email: '',
          pageOrBooking: '',
        })).toBeNull();
      },
    );

    it(
      'accepts a question with a name and only a phone',
      (): void => {
        expect(check({
          ...COMPLETE_ISSUE,
          category: ContactCategory.Question,
          email: '',
          phone: '(555) 010-0123',
        })).toBeNull();
      },
    );

    it.each([
      ['a name', { name: '  ' }],
      [
        'an email or a phone',
        {
          email: '',
          phone: '(___) ___-____',
        },
      ],
    ])(
      'rejects a question without %s',
      (_missing: string, change: Partial<ContactFormValue>): void => {
        expect(check({
          ...COMPLETE_ISSUE,
          category: ContactCategory.Question,
          ...change,
        })).not.toBeNull();
      },
    );

    it(
      'rejects an issue without the page or booking involved',
      (): void => {
        expect(check({
          ...COMPLETE_ISSUE,
          pageOrBooking: ' ',
        })).not.toBeNull();
      },
    );

    it(
      'accepts a complete issue',
      (): void => {
        expect(check(COMPLETE_ISSUE)).toBeNull();
      },
    );
  },
);
