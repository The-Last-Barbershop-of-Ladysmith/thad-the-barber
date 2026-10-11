import {
  Locator,
  Page,
  Route,
} from '@playwright/test';
import { expect, test } from '../support/fixtures';
import {
  GALLERY_LISTING_URL,
  TEST_GALLERY,
  galleryListing,
} from '../support/media';
import { collectPageErrors } from '../support/page-errors';

const HIDING_RESPONSES: Record<string, Parameters<Route['fulfill']>[0]> = {
  'an empty gallery folder': { body: galleryListing([]), contentType: 'application/xml' },
  'a failed listing': { status: 503 },
};

test.describe(
  'gallery',
  (): void => {
    test(
      'shows every supported image in the container listing, newest first, with alt text from its file name',
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
      },
    );

    for (const [outage, response] of Object.entries(HIDING_RESPONSES)) {
      test(
        `hides the gallery for ${outage}, and the rest of the page still works`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const pageErrors: Error[] = collectPageErrors(page);
          await page.route(GALLERY_LISTING_URL, (route: Route): Promise<void> => route.fulfill(response));
          const listingResponse: Promise<unknown> = page.waitForResponse(GALLERY_LISTING_URL);

          await page.goto('/');
          await listingResponse;

          await expect(page.locator('#visit')).toBeVisible();
          await expect(page.getByTestId('gallery')).toHaveCount(0);
          expect(pageErrors).toEqual([]);
        },
      );
    }
  },
);
