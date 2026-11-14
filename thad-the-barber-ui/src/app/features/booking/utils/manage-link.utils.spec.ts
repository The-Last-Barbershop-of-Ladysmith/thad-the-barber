import { toManageFragment, toManagePath } from './manage-link.utils';

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

describe(
  'toManageFragment',
  (): void => {
    it(
      'carries the token as t, encoding one that would otherwise break the fragment',
      (): void => {
        expect(toManageFragment('made-up-token')).toBe('t=made-up-token');
        expect(toManageFragment('made+up/token=&#')).toBe('t=made%2Bup%2Ftoken%3D%26%23');
      },
    );
  },
);
