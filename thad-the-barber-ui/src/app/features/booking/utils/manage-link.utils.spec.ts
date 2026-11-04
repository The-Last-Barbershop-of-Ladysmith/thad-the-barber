import { toManagePath } from './manage-link.utils';

describe(
  'toManagePath',
  (): void => {
    it(
      'builds the path, encoding an ID that would otherwise break the URL',
      (): void => {
        expect(toManagePath('made-up-booking')).toBe('/book/manage/made-up-booking');
        expect(toManagePath('made-up/booking?x')).toBe('/book/manage/made-up%2Fbooking%3Fx');
      },
    );
  },
);
