import { Locator, Page, Request, Route } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { GALLERY_URL, TEST_GALLERY } from '../support/media';
import { collectPageErrors } from '../support/page-errors';

const EMPTY_RESPONSES: Record<string, Parameters<Route['fulfill']>[0]> = {
  'an empty gallery': { json: [] },
  'a failed request': { status: 503 },
};

test.describe(
  'gallery',
  (): void => {
    test(
      'shows every supported image in the API, newest first, with alt text from its file name',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#gallery');

        const images: Locator = page.getByTestId('gallery').getByRole('img');
        await expect(images).toHaveCount(TEST_GALLERY.length);
        for (const [index, photo] of TEST_GALLERY.entries()) {
          const image: Locator = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await expect(image).toHaveAttribute('src', photo.src);
          await expect(image).toHaveAttribute('alt', photo.alt);
          const naturalWidth: () => Promise<number> = (): Promise<number> =>
            image.evaluate((element: HTMLImageElement): number => element.naturalWidth);
          await expect.poll(naturalWidth).toBeGreaterThan(0);
        }
        await expectNoA11yViolations(page);
      },
    );

    test(
      'opens a print in the lightbox, steps through the photos around the end, and Escape closes it and returns focus',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#gallery');
        const opener: Locator = page.getByTestId('gallery').getByRole('button').first();
        const count: Locator = page.getByTestId('lightbox-count');
        const next: Locator = page.getByTestId('lightbox-next');

        await opener.click();

        await expect(count).toHaveText(`1 / ${TEST_GALLERY.length}`);

        await next.click();

        await expect(count).toHaveText(`2 / ${TEST_GALLERY.length}`);

        await next.click();

        await expect(count).toHaveText(`1 / ${TEST_GALLERY.length}`);

        await page.keyboard.press('Escape');

        await expect(count).toHaveCount(0);
        await expect(opener).toBeFocused();
      },
    );

    test(
      'holds the section with a placeholder while the gallery loads',
      async ({ page }: { page: Page; }): Promise<void> => {
        let releaseGallery: () => void = (): void => undefined;
        const galleryHeld: Promise<void> = new Promise<void>((resolve: () => void): void => {
          releaseGallery = resolve;
        });
        await page.route(GALLERY_URL, async (route: Route): Promise<void> => {
          await galleryHeld;
          await route.fulfill({ json: [] });
        });

        await page.goto('/');

        await expect(page.getByTestId('gallery-loading')).toBeVisible();

        releaseGallery();

        await expect(page.getByTestId('gallery-loading')).toHaveCount(0);
      },
    );

    for (const [path, expectedRequests] of [['/', 1], ['/book', 0]] as const) {
      test(
        `makes ${expectedRequests} gallery request(s) on ${path}`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const galleryRequests: string[] = [];
          page.on('request', (request: Request): void => {
            if (request.url() === GALLERY_URL) {
              galleryRequests.push(request.url());
            }
          });

          await page.goto(path);
          await page.waitForLoadState('networkidle');

          expect(galleryRequests).toHaveLength(expectedRequests);
        },
      );
    }

    for (const [outage, response] of Object.entries(EMPTY_RESPONSES)) {
      test(
        `says there are no photos for ${outage}, and the rest of the page still works`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const pageErrors: Error[] = collectPageErrors(page);
          await page.route(GALLERY_URL, (route: Route): Promise<void> => route.fulfill(response));
          const galleryResponse: Promise<unknown> = page.waitForResponse(GALLERY_URL);

          await page.goto('/');
          await galleryResponse;

          await expect(page.locator('#visit')).toBeVisible();
          await expect(page.getByTestId('gallery-empty')).toBeVisible();
          await expect(page.getByTestId('gallery').getByRole('img')).toHaveCount(0);
          await expectNoA11yViolations(page);
          expect(pageErrors).toEqual([]);
        },
      );
    }
  },
);
