import { Page, Route } from '@playwright/test';
import { AdminGalleryPhotoDto } from '../../src/app/features/admin-gallery/dtos/admin-gallery-photo.dto';
import {
  ADMIN_GALLERY_URL,
  ADMIN_SESSION_URL,
  MockedGallery,
  adminSession,
  fulfillProblem,
  mockAdminGallery,
  mockGoogleSignIn,
} from '../support/admin';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const IMAGE_SRC: string = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const FADE: AdminGalleryPhotoDto = {
  fileName: 'skin-fade.jpg',
  src: IMAGE_SRC,
  altText: 'Skin fade',
  uploadedAt: '2026-10-05T10:00:00Z',
};

const BEARD: AdminGalleryPhotoDto = {
  fileName: 'beard-trim.jpg',
  src: IMAGE_SRC,
  altText: 'Beard trim',
  uploadedAt: '2026-10-01T10:00:00Z',
};

/** Signs in, then opens the gallery page by its menu link: a full page load would drop the in-memory token. */
async function signInAndOpenGallery(page: Page): Promise<void> {
  await mockGoogleSignIn(page);
  await page.route(
    (url: URL): boolean => url.href === ADMIN_SESSION_URL,
    async (route: Route): Promise<void> => {
      await route.fulfill({ json: adminSession() });
    },
  );
  await page.goto('/admin');
  await page.locator('#google-stub-button').click();
  await expect(page).toHaveURL(/\/admin\/overview$/);
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Gallery' }).click();
  await expect(page).toHaveURL(/\/admin\/gallery$/);
}

test.describe(
  'admin gallery',
  (): void => {
    test(
      'lists the photos with their descriptions',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockAdminGallery(page, [FADE, BEARD]);
        await signInAndOpenGallery(page);

        await expect(page.getByTestId('gallery-photo')).toHaveCount(2);
        await expect(page.getByRole('img', { name: 'Skin fade' })).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'adds a photo with its description, first in the list',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedGallery = await mockAdminGallery(page, [FADE]);
        await signInAndOpenGallery(page);

        await page.getByLabel('Photo', { exact: true }).setInputFiles({
          name: 'cut.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('not really a photo'),
        });
        await page.getByLabel('Description').fill('Classic taper');
        await page.getByTestId('upload-photo').click();

        await expect(page.getByTestId('gallery-photo')).toHaveCount(2);
        await expect(page.getByTestId('gallery-photo').first()).toContainText('Classic taper');
        await expect(page.getByLabel('Description')).toHaveValue('');
        expect(mocked.uploads).toEqual(['Classic taper']);
      },
    );

    test(
      'will not send a photo without a description, and says so',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedGallery = await mockAdminGallery(page, []);
        await signInAndOpenGallery(page);

        await page.getByLabel('Photo', { exact: true }).setInputFiles({
          name: 'cut.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('x'),
        });
        await page.getByTestId('upload-photo').click();

        await expect(page.getByTestId('upload-error')).toContainText('Describe the photo');
        expect(mocked.uploads).toHaveLength(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'asks twice before deleting a photo',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedGallery = await mockAdminGallery(page, [FADE, BEARD]);
        await signInAndOpenGallery(page);

        await page.getByTestId('delete-photo').first().click();
        expect(mocked.deletes).toHaveLength(0);
        await page.getByTestId('confirm-delete-photo').click();

        await expect(page.getByTestId('gallery-photo')).toHaveCount(1);
        expect(mocked.deletes).toEqual(['skin-fade.jpg']);
      },
    );

    test(
      'says so when the gallery cannot be reached',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(
          (url: URL): boolean => url.href === ADMIN_GALLERY_URL,
          (route: Route): Promise<void> => fulfillProblem(
            route,
            503,
            'gallery_unavailable',
          ),
        );
        await signInAndOpenGallery(page);

        await expect(page.getByTestId('gallery-error')).toContainText('could not be reached');
        await expectNoA11yViolations(page);
      },
    );
  },
);
