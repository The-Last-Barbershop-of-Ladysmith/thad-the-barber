import { fillSeoTemplate } from './seo.utils';

describe(
  'fillSeoTemplate',
  (): void => {
    it(
      'fills every copy of both placeholders',
      (): void => {
        const filled: string = fillSeoTemplate(
          '{shopName} in {city}: {shopName} again',
          'Made-Up Fades',
          'Faketown',
        );

        expect(filled).toBe('Made-Up Fades in Faketown: Made-Up Fades again');
      },
    );

    it(
      'leaves a template without placeholders alone',
      (): void => {
        expect(fillSeoTemplate(
          'Plain text',
          'Made-Up Fades',
          'Faketown',
        )).toBe('Plain text');
      },
    );

    it(
      'leaves an unknown placeholder in place',
      (): void => {
        expect(fillSeoTemplate(
          '{phone}',
          'Made-Up Fades',
          'Faketown',
        )).toBe('{phone}');
      },
    );
  },
);
