import { APIResponse, Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

interface SeoRoute {
  path: string;
  isIndexed: boolean;
}

interface ExpectedTag {
  attribute: 'name' | 'property';
  key: string;
  content: string | RegExp;
}

const SEO_ROUTES: SeoRoute[] = [
  { path: '/', isIndexed: true },
  { path: '/book', isIndexed: true },
  { path: '/privacy', isIndexed: true },
  { path: '/accessibility', isIndexed: true },
  { path: '/book/manage', isIndexed: false },
  { path: '/book/manage/made-up-id', isIndexed: false },
  { path: '/no-such-page', isIndexed: false },
];

const ANY_TEXT: RegExp = /\S/;
const SHARE_TAGS: ExpectedTag[] = [
  {
    attribute: 'name',
    key: 'description',
    content: ANY_TEXT,
  },
  {
    attribute: 'property',
    key: 'og:title',
    content: ANY_TEXT,
  },
  {
    attribute: 'property',
    key: 'og:image',
    content: /^https?:\/\//,
  },
  {
    attribute: 'property',
    key: 'og:image:alt',
    content: ANY_TEXT,
  },
  {
    attribute: 'name',
    key: 'twitter:card',
    content: 'summary_large_image',
  },
  {
    attribute: 'name',
    key: 'twitter:image:alt',
    content: ANY_TEXT,
  },
];

const SHARE_IMAGE_BYTE_BUDGET: number = 300 * 1024;

function metaTag(
  page: Page,
  attribute: 'name' | 'property',
  key: string,
): Locator {
  return page.locator(`meta[${attribute}="${key}"]`);
}

test.describe(
  'seo head tags',
  (): void => {
    for (const route of SEO_ROUTES) {
      test(
        `${route.path} sets its robots, canonical and share tags`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.goto(route.path);

          await expect(metaTag(
            page,
            'name',
            'robots',
          )).toHaveAttribute('content', route.isIndexed ? 'index, follow' : 'noindex, nofollow');
          await expect(page.locator('link[rel="canonical"]')).toHaveCount(route.isIndexed ? 1 : 0);
          for (const tag of SHARE_TAGS) {
            await expect(metaTag(
              page,
              tag.attribute,
              tag.key,
            )).toHaveAttribute('content', tag.content);
          }
        },
      );
    }

    test(
      'indexed routes point their canonical link at their own path',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');

        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/);
      },
    );

    test(
      'the share images are jpeg files under the size budget',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        const openGraphUrl: string = (await metaTag(
          page,
          'property',
          'og:image',
        ).getAttribute('content')) ?? '';
        const twitterUrl: string = (await metaTag(
          page,
          'name',
          'twitter:image',
        ).getAttribute('content')) ?? '';

        for (const imageUrl of [openGraphUrl, twitterUrl]) {
          const response: APIResponse = await page.request.get(new URL(imageUrl).pathname);
          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toBe('image/jpeg');
          expect((await response.body()).length).toBeLessThan(SHARE_IMAGE_BYTE_BUDGET);
        }
      },
    );
  },
);

test.describe(
  'accessibility page',
  (): void => {
    test(
      'footer link opens the page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('footer-accessibility').click();

        await expect(page).toHaveURL('/accessibility');
        await expect(page.getByTestId('accessibility')).toBeVisible();
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/accessibility');
        await expect(page.getByTestId('accessibility')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );
  },
);
