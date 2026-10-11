import {
  Locator,
  Page,
  Request,
  Route,
} from '@playwright/test';
import { GalleryPhoto } from '../../src/app/features/home/models/home.models';
import { expect, test } from '../support/fixtures';
import {
  MEDIA_BASE_URL,
  TEST_GALLERY,
  isMedia,
} from '../support/media';

test.describe(
  'gallery',
  (): void => {
    test(
      'loads each photo from the media container in a variant no wider than its original',
      async ({ page }: { page: Page; }): Promise<void> => {
        const imageRequests: string[] = [];
        page.on('request', (request: Request): void => {
          if (isMedia(new URL(request.url())) && request.url().endsWith('.webp')) {
            imageRequests.push(request.url());
          }
        });
        await page.goto('/#gallery');

        const images: Locator = page.getByTestId('gallery').getByRole('img');
        await expect(images).toHaveCount(TEST_GALLERY.photos.length);
        for (const [index, photo] of TEST_GALLERY.photos.entries()) {
          const image: Locator = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await expect(image).toHaveAttribute('alt', photo.alt);
          const naturalWidth: () => Promise<number> = (): Promise<number> =>
            image.evaluate((element: HTMLImageElement): number => element.naturalWidth);
          await expect.poll(naturalWidth).toBeGreaterThan(0);
          const variants: string[] = [
            'sm',
            'md',
            'lg',
          ].map(
            (size: string): string => `${MEDIA_BASE_URL}/gallery/${photo.image}-${size}.webp`,
          );
          expect(variants).toContain(await image.evaluate((element: HTMLImageElement): string => element.currentSrc));
        }

        const narrow: GalleryPhoto | undefined = TEST_GALLERY.photos[0];
        expect(imageRequests.filter((url: string): boolean => url.includes(`/${narrow?.image}-`)))
          .toEqual([`${MEDIA_BASE_URL}/gallery/${narrow?.image}-sm.webp`]);
      },
    );

    test(
      'hides the gallery when the media container is down, and the rest of the page still works',
      async ({ page }: { page: Page; }): Promise<void> => {
        const pageErrors: Error[] = [];
        page.on('pageerror', (error: Error): void => {
          pageErrors.push(error);
        });
        await page.route(
          `${MEDIA_BASE_URL}/content/gallery.json`,
          (route: Route): Promise<void> => route.fulfill({ status: 503 }),
        );
        const galleryResponse: Promise<unknown> = page.waitForResponse(`${MEDIA_BASE_URL}/content/gallery.json`);

        await page.goto('/');
        await galleryResponse;

        await expect(page.locator('#visit')).toBeVisible();
        await expect(page.getByTestId('gallery')).toHaveCount(0);
        expect(pageErrors).toEqual([]);
      },
    );
  },
);
