import { Locator, Page, Route } from '@playwright/test';
import { AdminAnnouncementDto } from '../../src/app/features/admin/announcements/dtos/admin-announcement.dto';
import {
  AdminAnnouncementStatus,
} from '../../src/app/features/admin/announcements/models/admin-announcement-status.model';
import {
  ADMIN_ANNOUNCEMENTS_URL,
  ADMIN_SESSION_URL,
  MockedAnnouncements,
  adminSession,
  fulfillProblem,
  mockAdminAnnouncements,
  mockAnnouncementImageUpload,
  goToAdminSection,
  mockGoogleSignIn,
} from '../support/admin';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const HOLIDAY: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<p>We are closed on the holiday.</p>',
  startDate: '2026-01-01',
  endDate: '2099-12-31',
  image: null,
  buttons: [],
  status: AdminAnnouncementStatus.Showing,
};

const SOON: AdminAnnouncementDto = {
  ...HOLIDAY,
  title: 'Spring promotion',
  startDate: '2098-03-01',
  status: AdminAnnouncementStatus.Scheduled,
};

/** Signs in, then opens the announcements list by its menu link: a full page load would drop the in-memory token. */
async function signInAndOpenList(page: Page): Promise<void> {
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
  await goToAdminSection(page, 'Announcements');
  await expect(page).toHaveURL(/\/admin\/announcements$/);
}

test.describe(
  'admin announcements',
  (): void => {
    test(
      'lists every announcement with its status and filters by it',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockAdminAnnouncements(page, [HOLIDAY, SOON]);
        await signInAndOpenList(page);

        await expect(page.getByTestId('announcement-item')).toHaveCount(2);
        await page.getByRole('button', { name: 'Scheduled 1' }).click();
        await expect(page.getByTestId('announcement-item')).toHaveCount(1);
        await expect(page.getByTestId('announcement-item')).toContainText('Spring promotion');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'writes a new announcement and saves the whole list',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, [HOLIDAY]);
        await signInAndOpenList(page);
        await page.getByTestId('new-announcement').click();

        await expect(page.getByRole('heading', { level: 1, name: 'New announcement' })).toBeVisible();
        await expectNoA11yViolations(page);
        await page.getByLabel('Title').fill('Open late Fridays');
        await page.getByRole('textbox', { name: 'Message' }).fill('We are open until 8 PM on Fridays.');
        await page.keyboard.press('Control+A');
        await page.getByTestId('format-bold').click();
        await expect(page.getByTestId('preview-body').locator('strong')).toHaveText('We are open until 8 PM on Fridays.');
        await page.getByTestId('save-announcement').click();

        await expect(page).toHaveURL(/\/admin\/announcements$/);
        await expect(page.getByTestId('announcement-item')).toHaveCount(2);
        expect(mocked.saves).toHaveLength(1);
        expect(mocked.saves[0]?.[1]?.title).toBe('Open late Fridays');
        expect(mocked.saves[0]?.[1]?.bodyHtml).toBe('<p><strong>We are open until 8 PM on Fridays.</strong></p>');
      },
    );

    test(
      'makes selected words a link, and refuses a link the site does not accept',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, []);
        await signInAndOpenList(page);
        await page.getByTestId('new-announcement').click();
        await page.getByLabel('Title').fill('Book now');
        await page.getByRole('textbox', { name: 'Message' }).fill('Book your cut');

        await page.getByTestId('format-link').click();
        await expect(page.getByTestId('link-problem')).toBeVisible();

        await page.getByRole('textbox', { name: 'Message' }).click();
        await page.keyboard.press('Control+A');
        await page.getByTestId('format-link').click();
        await page.getByTestId('link-url').fill('javascript:alert(1)');
        await page.getByTestId('link-apply').click();
        await expect(page.getByTestId('link-problem')).toBeVisible();

        await page.getByTestId('link-url').fill('/book');
        await page.getByTestId('link-apply').click();
        await expect(page.getByTestId('preview-body').locator('a')).toHaveAttribute('href', '/book');
        await page.getByTestId('save-announcement').click();

        await expect(page).toHaveURL(/\/admin\/announcements$/);
        expect(mocked.saves[0]?.[0]?.bodyHtml).toBe('<p><a href="/book">Book your cut</a></p>');
      },
    );

    test(
      'makes bullet and numbered lists that show their markers, and saves them',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, []);
        await signInAndOpenList(page);
        await page.getByTestId('new-announcement').click();
        await page.getByLabel('Title').fill('Hot towel shaves');
        const editor: Locator = page.getByRole('textbox', { name: 'Message' });
        await editor.click();

        await page.getByTestId('format-bulletList').click();
        await expect(editor).toBeFocused();
        await page.keyboard.type('Hot towel');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Beard trim');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.getByTestId('format-numberedList').click();
        await expect(editor).toBeFocused();
        await page.keyboard.type('Pick a day');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Pick a time');

        await expect(editor.locator('ul')).toHaveCSS('list-style-type', 'disc');
        await expect(editor.locator('ol')).toHaveCSS('list-style-type', 'decimal');
        await expect(page.getByTestId('format-numberedList')).toHaveAttribute('aria-pressed', 'true');
        await page.getByTestId('save-announcement').click();

        await expect(page).toHaveURL(/\/admin\/announcements$/);
        expect(mocked.saves[0]?.[0]?.bodyHtml).toBe(
          '<ul><li><p>Hot towel</p></li><li><p>Beard trim</p></li></ul><ol><li><p>Pick a day</p></li><li><p>Pick a time</p></li></ol>',
        );
      },
    );

    test(
      'will not save without a title, and says so',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, []);
        await signInAndOpenList(page);
        await page.getByTestId('new-announcement').click();

        await page.getByTestId('save-announcement').click();

        await expect(page.getByTestId('title-error')).toBeVisible();
        expect(mocked.saves).toHaveLength(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'edits, ends and deletes an announcement',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, [HOLIDAY, SOON]);
        await signInAndOpenList(page);
        await page.getByRole('link', { name: 'Edit' }).first().click();

        await expect(page.getByLabel('Title')).toHaveValue('Holiday hours');
        await page.getByLabel('Title').fill('Holiday hours 2026');
        await page.getByTestId('save-announcement').click();
        await expect(page).toHaveURL(/\/admin\/announcements$/);
        expect(mocked.saves[0]?.[0]?.title).toBe('Holiday hours 2026');

        await page.getByRole('link', { name: 'Edit' }).nth(1).click();
        await page.getByTestId('delete-announcement').click();
        await page.getByTestId('confirm-delete').click();
        await expect(page).toHaveURL(/\/admin\/announcements$/);
        await expect(page.getByTestId('announcement-item')).toHaveCount(1);
        expect(mocked.saves[1]).toHaveLength(1);
      },
    );

    test(
      'adds a photo to an announcement, then asks for its description before saving',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedAnnouncements = await mockAdminAnnouncements(page, []);
        await mockAnnouncementImageUpload(page);
        await signInAndOpenList(page);
        await page.getByTestId('new-announcement').click();

        await page.getByLabel('Title').fill('Big sale');
        await page.getByTestId('announcement-photo').locator('input[type="file"]').setInputFiles({
          name: 'sale sign.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('not really a photo'),
        });
        await expect(page.getByLabel('Description for screen readers')).toBeVisible();
        await page.getByTestId('save-announcement').click();
        await expect(page.getByTestId('alt-error')).toBeVisible();
        expect(mocked.saves).toHaveLength(0);

        await page.getByLabel('Description for screen readers').fill('A sign that says sale');
        await page.getByTestId('save-announcement').click();

        await expect(page).toHaveURL(/\/admin\/announcements$/);
        expect(mocked.saves[0]?.[0]?.image).toEqual({
          fileName: 'sale-sign-1a2b3c4d.jpg',
          altText: 'A sign that says sale',
          position: 'right',
        });
      },
    );

    test(
      'says so when the announcements file cannot be reached',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(
          (url: URL): boolean => url.href === ADMIN_ANNOUNCEMENTS_URL,
          (route: Route): Promise<void> => fulfillProblem(
            route,
            503,
            'announcements_unavailable',
          ),
        );
        await signInAndOpenList(page);

        await expect(page.getByTestId('announcements-error')).toContainText('could not be reached');
        await expectNoA11yViolations(page);
      },
    );
  },
);
