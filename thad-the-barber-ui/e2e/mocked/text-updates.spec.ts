import { Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'text updates',
  (): void => {
    test(
      'the page shows the sign-up and its consent wording, and the button stays off until it is filled in',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/text-updates');

        await expect(page.getByTestId('text-updates-page')).toBeVisible();
        await expect(page.getByTestId('text-updates-submit')).toBeDisabled();
        await page.locator('#text-updates-page-phone').fill('5550100142');
        await page.getByTestId('text-updates-consent').click();
        await expect(page.getByTestId('text-updates-submit')).toBeEnabled();
      },
    );

    test(
      'the footer button opens the same sign-up in a dialog',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('text-updates-open').click();

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('dialog').getByTestId('text-updates-form')).toBeVisible();
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/text-updates');
        await expect(page.getByTestId('text-updates-page')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );
  },
);
