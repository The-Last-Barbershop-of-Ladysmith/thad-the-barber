import { ContactRequest } from '../dtos/contact-request.dto';
import { ContactCategory } from '../../../shared/models/contact-category.model';
import { ContactFormValue } from '../models/contact-form-value.model';
import { toContactRequest } from './contact-request.utils';

const EMPTY_FORM: ContactFormValue = {
  category: ContactCategory.Feedback,
  message: 'Made-up message',
  name: '',
  email: '',
  phone: '',
  pageOrBooking: '',
};

describe(
  'toContactRequest',
  (): void => {
    it(
      'leaves out every field the visitor left empty',
      (): void => {
        const request: ContactRequest = toContactRequest({
          ...EMPTY_FORM,
          name: '   ',
          phone: '(___) ___-____',
        });

        expect(request).toEqual({
          category: ContactCategory.Feedback,
          message: 'Made-up message',
        });
      },
    );

    it(
      'trims the text fields and sends the phone as E.164',
      (): void => {
        const request: ContactRequest = toContactRequest({
          category: ContactCategory.Issue,
          message: '  Made-up problem  ',
          name: ' Fake Person ',
          email: ' fake.person@example.test ',
          phone: '(555) 010-0123',
          pageOrBooking: ' /book ',
        });

        expect(request).toEqual({
          category: ContactCategory.Issue,
          message: 'Made-up problem',
          name: 'Fake Person',
          email: 'fake.person@example.test',
          phone: '+15550100123',
          pageOrBooking: '/book',
        });
      },
    );
  },
);
