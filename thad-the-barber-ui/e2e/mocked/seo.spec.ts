import { APIResponse, Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

interface SeoRoute {
  path: string;
  isIndexed: boolean;
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

const OPEN_GRAPH_IMAGE_BYTE_BUDGET: number = 300 * 1024;

function metaContent(
  page: Page,
  attribute: 'name' | 'property',
  key: string,
): Locator {
  return page.locator(`meta[${attribute}="${key}"]`);
}

async function titleOf(page: Page, path: string): Promise<string> {
  await page.goto(path);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  return page.title();
}

test.describe(
  'seo head tags',
  (): void => {
    for (const route of SEO_ROUTES) {
      test(
        `${route.path} sets its title, description, robots and share tags`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.goto(route.path);

          await expect(metaContent(
            page,
            'name',
            'robots',
          )).toHaveAttribute(
            'content',
            route.isIndexed ? 'index, follow' : 'noindex, nofollow',
          );
          await expect(metaContent(
            page,
            'name',
            'description',
          )).toHaveAttribute('content', /\S/);
          await expect(metaContent(
            page,
            'property',
            'og:title',
          )).toHaveAttribute('content', /\S/);
          await expect(metaContent(
            page,
            'property',
            'og:image',
          )).toHaveAttribute('content', /^https?:\/\//);
          await expect(metaContent(
            page,
            'name',
            'twitter:card',
          )).toHaveAttribute('content', 'summary_large_image');
          await expect(metaContent(
            page,
            'property',
            'og:image:alt',
          )).toHaveAttribute('content', /\S/);
          await expect(metaContent(
            page,
            'name',
            'twitter:image:alt',
          )).toHaveAttribute('content', /\S/);
          await expect(page.locator('link[rel="canonical"]')).toHaveCount(route.isIndexed ? 1 : 0);
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
      'every route gets a different title',
      async ({ page }: { page: Page; }): Promise<void> => {
        const titles: string[] = [];
        for (const route of SEO_ROUTES) {
          titles.push(await titleOf(page, route.path));
        }

        expect(new Set(titles).size).toBe(SEO_ROUTES.length);
      },
    );

    test(
      'the share images are jpeg files under the size budget',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        const openGraphUrl: string = (await metaContent(
          page,
          'property',
          'og:image',
        ).getAttribute('content')) ?? '';
        const twitterUrl: string = (await metaContent(
          page,
          'name',
          'twitter:image',
        ).getAttribute('content')) ?? '';

        for (const imageUrl of [openGraphUrl, twitterUrl]) {
          const response: APIResponse = await page.request.get(new URL(imageUrl).pathname);
          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toBe('image/jpeg');
          expect((await response.body()).length).toBeLessThan(OPEN_GRAPH_IMAGE_BYTE_BUDGET);
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
