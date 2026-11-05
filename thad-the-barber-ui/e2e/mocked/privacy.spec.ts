import { Page } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'privacy',
  (): void => {
    test(
      'footer link opens the page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('footer-privacy').click();

        await expect(page).toHaveURL('/privacy');
        await expect(page.getByTestId('privacy')).toBeVisible();
      },
    );

    test(
      "gives the shop's phone from Square",
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');

        await expect(page.getByTestId('privacy-phone')).toHaveAttribute('href', `tel:${TEST_SHOP.phone}`);
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');
        await expect(page.getByTestId('privacy')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );
  },
);
