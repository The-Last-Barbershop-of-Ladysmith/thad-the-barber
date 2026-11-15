import { ContactCategory } from '../models/contact-category.model';
import { ContactPrefill } from '../models/contact-prefill.model';
import { toContactPrefill } from './contact-prefill.utils';

describe(
  'toContactPrefill',
  (): void => {
    it(
      'reads a known category and the page',
      (): void => {
        const prefill: ContactPrefill | null = toContactPrefill({
          category: 'issue',
          pageOrBooking: '/book',
        });

        expect(prefill).toEqual({
          category: ContactCategory.Issue,
          pageOrBooking: '/book',
        });
      },
    );

    it.each([
      null,
      undefined,
      'issue',
      {},
      {
        category: 'complaint',
        pageOrBooking: '/book',
      },
      { category: 'issue' },
      {
        category: 'issue',
        pageOrBooking: 7,
      },
    ])(
      'is null for state that is not a prefill: %j',
      (state: unknown): void => {
        expect(toContactPrefill(state)).toBeNull();
      },
    );
  },
);
