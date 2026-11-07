import { Page, Route } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { ANNOUNCEMENTS_URL } from '../support/media';

async function isSectionJustBelowHeader(page: Page, sectionId: string): Promise<boolean> {
  return page.evaluate((id: string): boolean => {
    const sectionTop: number = document.getElementById(id)?.getBoundingClientRect().top ?? -1;
    const headerBottom: number = document.querySelector('[data-site-top]')?.getBoundingClientRect().bottom ?? 0;
    const gap: number = sectionTop - headerBottom;
    return gap >= 0 && gap <= 32;
  }, sectionId);
}

test.describe(
  'deep link',
  (): void => {
    test(
      'keeps the section just below the header and strip while the page finishes loading',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#visit');

        await expect.poll(
          async (): Promise<boolean> => isSectionJustBelowHeader(page, 'visit'),
          { timeout: 10_000 },
        ).toBe(true);
      },
    );

    test(
      'keeps the section just below the header when the announcement strip arrives after the first scroll',
      async ({ page }: { page: Page; }): Promise<void> => {
        let releaseAnnouncements: () => void = (): void => undefined;
        const announcementsGate: Promise<void> = new Promise<void>((resolve: () => void): void => {
          releaseAnnouncements = resolve;
        });
        await page.route(ANNOUNCEMENTS_URL, async (route: Route): Promise<void> => {
          await announcementsGate;
          await route.fallback();
        });
        await page.goto('/#visit');

        releaseAnnouncements();

        await expect(page.getByTestId('announcement-strip')).toBeVisible();
        await expect.poll(
          async (): Promise<boolean> => isSectionJustBelowHeader(page, 'visit'),
          { timeout: 10_000 },
        ).toBe(true);
      },
    );
  },
);
