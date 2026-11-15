import { toSitemapXml } from './sitemap.utils';

describe(
  'toSitemapXml',
  (): void => {
    it(
      'lists the home page as the site root and every other route under it',
      (): void => {
        const xml: string = toSitemapXml(
          'https://fake-shop.example',
          [
            '',
            'made-up-page',
          ],
        );

        expect(xml).toContain('<loc>https://fake-shop.example/</loc>');
        expect(xml).toContain('<loc>https://fake-shop.example/made-up-page</loc>');
      },
    );

    it(
      'lists nothing else',
      (): void => {
        const xml: string = toSitemapXml(
          'https://fake-shop.example',
          [''],
        );

        expect(xml.match(/<loc>/g)).toHaveLength(1);
      },
    );
  },
);
