import { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const PHONE_SIZES: readonly { width: number; height: number; }[] = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 360, height: 568 },
  { width: 320, height: 568 },
];

test.describe(
  'hero under the fixed header and announcement strip',
  (): void => {
    for (const size of PHONE_SIZES) {
      test(
        `${size.width}x${size.height}: the open/closed pill and the title start below the strip and header`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize(size);

          await page.goto('/');
          await expect(page.getByTestId('announcement-strip')).toBeVisible();
          await expect(page.getByTestId('open-status')).toBeVisible();

          const topBottom: number = await page.locator('app-header .top').evaluate(
            (element: Element): number => element.getBoundingClientRect().bottom,
          );
          const pill: Locator = page.getByTestId('open-status');
          const pillTop: number = await pill.evaluate(
            (element: Element): number => element.getBoundingClientRect().top,
          );
          expect(pillTop).toBeGreaterThanOrEqual(topBottom);
          const titleTop: number = await page.getByRole('heading', { level: 1 }).evaluate(
            (element: Element): number => element.getBoundingClientRect().top,
          );
          expect(titleTop).toBeGreaterThanOrEqual(topBottom);
        },
      );
    }
  },
);
