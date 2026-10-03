import { Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'not found',
  (): void => {
    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.goto('/no-such-page');
      await expect(page.getByTestId('not-found')).toBeVisible();
    });

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expectNoA11yViolations(page);
      },
    );

    test(
      'book link opens the booking page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.getByTestId('not-found-book').click();
        await expect(page).toHaveURL('/book');
      },
    );

    test(
      'home link opens the home page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.getByTestId('not-found-home').click();
        await expect(page).toHaveURL('/');
      },
    );
  },
);
