import { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const PAGES: readonly string[] = ['/', '/book'];

test.describe(
  'skip link',
  (): void => {
    for (const path of PAGES) {
      test.describe(
        path,
        (): void => {
          test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
            await page.goto(path);
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          });

          test(
            'is the first stop on Tab and shows clear of the header',
            async ({ page, browserName }: { page: Page; browserName: string; }): Promise<void> => {
              test.skip(browserName === 'webkit', 'Safari does not Tab to links unless its setting is turned on');
              const skipLink: Locator = page.getByTestId('skip-link');

              await page.keyboard.press('Tab');

              await expect(skipLink).toBeFocused();
              await expect(skipLink).toBeInViewport({ ratio: 1 });
            },
          );

          test(
            'moves focus to the main content when used',
            async ({ page }: { page: Page; }): Promise<void> => {
              await page.getByTestId('skip-link').focus();

              await page.keyboard.press('Enter');

              await expect(page.locator('main')).toBeFocused();
            },
          );
        },
      );
    }
  },
);
