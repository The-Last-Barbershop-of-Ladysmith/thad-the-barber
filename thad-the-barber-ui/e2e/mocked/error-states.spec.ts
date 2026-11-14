import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const ERROR_TOAST: string = '.p-toast-message-error';

/** Throws outside any Angular call, as a stray timer callback would; the global error listeners forward it. */
async function throwUncaughtError(page: Page): Promise<void> {
  await page.evaluate((): void => {
    setTimeout((): never => {
      throw new Error('made-up uncaught error');
    });
  });
}

test.describe(
  'error and offline states',
  (): void => {
    test(
      'shows one sticky error toast for two uncaught errors in a row, and axe is clean with it showing',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');
        await expect(page.getByTestId('privacy')).toBeVisible();

        await throwUncaughtError(page);
        const toast: Locator = page.locator(ERROR_TOAST);
        await expect(toast).toBeVisible();
        await throwUncaughtError(page);

        await expect(toast).toHaveCount(1);
        await expect(toast).toHaveAttribute('role', 'alert');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'shows the offline banner while offline and hides it when back online, axe clean with it showing',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');
        await expect(page.getByTestId('privacy')).toBeVisible();
        const banner: Locator = page.getByTestId('offline-banner');
        await expect(banner).toHaveCount(0);

        await page.context().setOffline(true);
        await expect(banner).toBeVisible();
        await expect(banner).toHaveAttribute('role', 'alert');
        await expectNoA11yViolations(page);

        await page.context().setOffline(false);
        await expect(banner).toHaveCount(0);
      },
    );
  },
);
