import { Page } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'terms',
  (): void => {
    test(
      'footer link opens the page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('footer-terms').click();

        await expect(page).toHaveURL('/terms');
        await expect(page.getByTestId('terms')).toBeVisible();
      },
    );

    test(
      "gives the shop's phone from Square in the contact section",
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/terms');

        await expect(page.getByTestId('terms-section-contact').getByTestId('terms-phone').first())
          .toHaveAttribute('href', `tel:${TEST_SHOP.phone}`);
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/terms');
        await expect(page.getByTestId('terms')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );
  },
);
