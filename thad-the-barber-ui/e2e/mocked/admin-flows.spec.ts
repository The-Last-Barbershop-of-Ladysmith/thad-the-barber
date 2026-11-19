import { Locator, Page, Route } from '@playwright/test';
import { AdminAnnouncementDto } from '../../src/app/features/admin/announcements/dtos/admin-announcement.dto';
import {
  AdminAnnouncementStatus,
} from '../../src/app/features/admin/announcements/models/admin-announcement-status.model';
import {
  AnnouncementButtonVariant,
} from '../../src/app/features/admin/announcements/models/announcement-button-variant.model';
import {
  AnnouncementImagePosition,
} from '../../src/app/features/admin/announcements/models/announcement-image-position.model';
import { AdminGalleryPhotoDto } from '../../src/app/features/admin/gallery/dtos/admin-gallery-photo.dto';
import {
  ADMIN_SESSION_URL,
  MOCK_IMAGE_SRC,
  adminSession,
  goToAdminSection,
  mockAdminAnnouncements,
  mockAdminGallery,
  mockAdminShop,
  mockGoogleSignIn,
  openAdminMenu,
} from '../support/admin';
import { expect, test } from '../support/fixtures';

const FULL_ANNOUNCEMENT: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<h2>Closed Thanksgiving</h2><p>We are <strong>closed</strong> with <mark>walk-ins</mark> after.</p>',
  startDate: '2026-01-01',
  endDate: '2099-12-31',
  image: {
    fileName: 'sign.webp',
    src: MOCK_IMAGE_SRC,
    altText: 'A made-up sign',
    position: AnnouncementImagePosition.Left,
  },
  buttons: [
    {
      label: 'Book a cut',
      url: '/book',
      variant: AnnouncementButtonVariant.Primary,
    },
  ],
  status: AdminAnnouncementStatus.Showing,
};

const PHOTO: AdminGalleryPhotoDto = {
  fileName: 'skin-fade.jpg',
  src: MOCK_IMAGE_SRC,
  altText: 'Skin fade',
  uploadedAt: '2026-10-05T10:00:00Z',
};

async function signIn(page: Page): Promise<void> {
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
}

async function openAnnouncementToEdit(page: Page): Promise<void> {
  await mockAdminAnnouncements(page, [FULL_ANNOUNCEMENT]);
  await signIn(page);
  await goToAdminSection(page, 'Announcements');
  await expect(page).toHaveURL(/\/admin\/announcements$/);
  await page.getByRole('link', { name: 'Edit', exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/announcements\/0$/);
  await expect(page.getByTestId('admin-heading')).toBeVisible();
}

test.describe(
  'admin overview and menu',
  (): void => {
    test(
      'shows what is live on the site, and each tile leads to its tool',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockAdminAnnouncements(page, [FULL_ANNOUNCEMENT]);
        await mockAdminGallery(page, [PHOTO]);
        await mockAdminShop(page, {
          notice: 'Closed Monday.',
          isNoticeShown: true,
          squareNotice: null,
        });
        await signIn(page);

        await expect(page.getByTestId('announcement-counts')).toContainText('1 showing');
        await expect(page.getByTestId('gallery-thumbs').locator('img')).toHaveCount(1);
        await expect(page.getByTestId('overview-notice')).toHaveText('Closed Monday.');
        await expect(page.getByTestId('overview-notice-state')).toContainText('Showing on the booking page');

        await page.getByTestId('overview-gallery').click();
        await expect(page).toHaveURL(/\/admin\/gallery$/);
      },
    );

    test(
      'on a phone the menu opens over the page, closes on Escape and gives focus back, and a link closes it',
      async ({ page }: { page: Page; }): Promise<void> => {
        await signIn(page);
        const toggle: Locator = page.getByTestId('admin-menu-toggle');
        test.skip(!(await toggle.isVisible()), 'The menu is a side bar on a wide screen, not a drawer');

        await openAdminMenu(page);
        await expect(page.getByRole('dialog', { name: 'Admin menu' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Admin menu' })).toHaveCount(0);
        await expect(toggle).toBeFocused();

        await goToAdminSection(page, 'Shop info');
        await expect(page).toHaveURL(/\/admin\/shop$/);
        await expect(page.getByRole('dialog', { name: 'Admin menu' })).toHaveCount(0);
      },
    );

    test(
      'a wide screen has the menu beside the page, with the signed-in name and email',
      async ({ page }: { page: Page; }): Promise<void> => {
        await signIn(page);
        test.skip(await page.getByTestId('admin-menu-toggle').isVisible(), 'A phone has the drawer instead');

        await expect(page.getByTestId('admin-name')).toHaveCount(1);
        await expect(page.getByTestId('admin-email')).toBeVisible();
        await expect(page.getByTestId('admin-until')).toBeVisible();
      },
    );
  },
);

test.describe(
  'admin announcement form',
  (): void => {
    test(
      'starts today unless a start day is chosen, and shows the first day only then',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openAnnouncementToEdit(page);
        await expect(page.getByLabel('First day')).toHaveCount(0);

        await page.getByTestId('show-on-dates').click();
        await expect(page.getByLabel('First day')).toBeVisible();

        await page.getByTestId('show-now').click();
        await expect(page.getByLabel('First day')).toHaveCount(0);
      },
    );

    test(
      'asks twice before removing the photo, and twice before removing a button',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openAnnouncementToEdit(page);

        await page.getByTestId('remove-photo').click();
        await expect(page.getByTestId('confirm-remove-photo')).toBeVisible();
        await expect(page.getByTestId('photo-drop-zone')).toBeVisible();
        await page.getByTestId('confirm-remove-photo').click();
        await expect(page.getByLabel('Description for screen readers')).toHaveCount(0);

        await page.getByTestId('remove-button').click();
        await expect(page.getByTestId('button-row')).toHaveCount(1);
        await page.getByTestId('confirm-remove-button').click();
        await expect(page.getByTestId('button-row')).toHaveCount(0);
      },
    );

    test(
      'previews at desktop width on a wide screen and at phone width on a phone, and can be switched',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openAnnouncementToEdit(page);
        const isPhone: boolean = await page.getByTestId('admin-menu-toggle').isVisible();
        const viewport: Locator = page.locator('.preview-viewport');

        await expect(page.getByTestId(isPhone ? 'preview-phone' : 'preview-desktop')).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('preview-phone').click();
        await expect(viewport).toHaveClass(/is-phone/);
        await page.getByTestId('preview-desktop').click();
        await expect(viewport).not.toHaveClass(/is-phone/);
      },
    );

    test(
      'the preview follows the message and the title',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openAnnouncementToEdit(page);

        await page.getByLabel('Title').fill('Open late');

        await expect(page.getByTestId('announcement-preview')).toContainText('Open late');
        await expect(page.getByTestId('preview-body').locator('mark')).toHaveText('walk-ins');
      },
    );

    test(
      'the editor toolbar formats the selected words, and undo takes it back',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockAdminAnnouncements(page, []);
        await signIn(page);
        await goToAdminSection(page, 'Announcements');
        await page.getByTestId('new-announcement').click();
        const editor: Locator = page.getByRole('textbox', { name: 'Message' });
        await editor.fill('Walk-ins welcome');
        await editor.selectText();

        await page.getByTestId('format-bold').click();
        await expect(editor.locator('strong')).toHaveText('Walk-ins welcome');
        await expect(page.getByTestId('format-bold')).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('format-undo').click();
        await expect(editor.locator('strong')).toHaveCount(0);
      },
    );
  },
);

test.describe(
  'admin gallery',
  (): void => {
    test(
      'a photo chosen is listed with a way to take it back out, and a delete asks twice',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockAdminGallery(page, [PHOTO]);
        await signIn(page);
        await goToAdminSection(page, 'Gallery');
        const fileInput: Locator = page.getByTestId('gallery-file').locator('input[type="file"]');

        await fileInput.setInputFiles({
          name: 'cut.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('not really a photo'),
        });
        await expect(page.getByTestId('gallery-file')).toContainText('cut.jpg');
        await expect(page.getByTestId('photo-drop-zone')).toHaveCount(0);

        await page.getByTestId('delete-photo').click();
        await expect(page.getByTestId('confirm-delete-photo')).toBeVisible();
        await expect(page.getByTestId('gallery-photo')).toHaveCount(1);
      },
    );
  },
);
