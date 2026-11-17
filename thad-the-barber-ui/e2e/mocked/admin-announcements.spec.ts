import { Page, Route } from '@playwright/test';
import { AdminAnnouncementDto } from '../../src/app/features/admin-announcements/dtos/admin-announcement.dto';
import {
  AdminAnnouncementStatus,
} from '../../src/app/features/admin-announcements/models/admin-announcement-status.model';
import {
  ADMIN_ANNOUNCEMENTS_URL,
  ADMIN_SESSION_URL,
  MockedAnnouncements,
  adminSession,
  fulfillProblem,
  mockAdminAnnouncements,
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
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Announcements' }).click();
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
        await page.getByLabel('Message').fill('We are open until **8 PM** on Fridays.');
        await page.getByTestId('save-announcement').click();

        await expect(page).toHaveURL(/\/admin\/announcements$/);
        await expect(page.getByTestId('announcement-item')).toHaveCount(2);
        expect(mocked.saves).toHaveLength(1);
        expect(mocked.saves[0]?.[1]?.title).toBe('Open late Fridays');
        expect(mocked.saves[0]?.[1]?.bodyHtml).toBe('<p>We are open until <strong>8 PM</strong> on Fridays.</p>');
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
