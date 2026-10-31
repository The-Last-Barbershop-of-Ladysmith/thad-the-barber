import { readManageToken, toManageLink, toManagePath } from './manage-link.utils';

describe(
  'manage link',
  (): void => {
    it(
      'builds the path and the full link, with the token only in the fragment',
      (): void => {
        const link: string = toManageLink('https://site.example', { id: 'made-up-booking', manageToken: 'Made-up_Token-1' });

        expect(toManagePath('made-up-booking')).toBe('/book/manage/made-up-booking');
        expect(link).toBe('https://site.example/book/manage/made-up-booking#t=Made-up_Token-1');
      },
    );

    it(
      'encodes an ID or token that would otherwise break the URL',
      (): void => {
        expect(toManagePath('made-up/booking?x')).toBe('/book/manage/made-up%2Fbooking%3Fx');
        const link: string = toManageLink('https://site.example', { id: 'made-up-booking', manageToken: 'made+up&token=' });

        expect(readManageToken(new URL(link).hash.slice(1))).toBe('made+up&token=');
      },
    );

    it(
      'reads the token from the fragment, and none from a missing, empty or other fragment',
      (): void => {
        expect(readManageToken('t=made-up-token')).toBe('made-up-token');
        expect(readManageToken(null)).toBeNull();
        expect(readManageToken('')).toBeNull();
        expect(readManageToken('t=')).toBeNull();
        expect(readManageToken('top')).toBeNull();
      },
    );
  },
);
