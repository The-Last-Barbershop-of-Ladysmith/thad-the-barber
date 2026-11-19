import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'text updates',
  (): void => {
    test(
      'the page shows the sign-up and its consent wording, and the button stays off until it is filled in',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/text-updates');
        const signup: Locator = page.getByTestId('text-updates-page');

        await expect(signup).toBeVisible();
        await expect(signup.getByTestId('text-updates-submit')).toBeDisabled();
        await page.locator('#text-updates-page-phone').fill('5550100142');
        await signup.getByTestId('text-updates-consent').click();
        await expect(signup.getByTestId('text-updates-submit')).toBeEnabled();
      },
    );

    test(
      'the footer carries the same sign-up on every page, without opening anything',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        const signup: Locator = page.getByTestId('footer-text-updates');

        await expect(signup.getByTestId('text-updates-form')).toBeAttached();
        await expect(signup.getByTestId('text-updates-submit')).toBeDisabled();
        await page.locator('#footer-text-updates-phone').fill('5550100142');
        await signup.getByTestId('text-updates-consent').click();
        await expect(signup.getByTestId('text-updates-submit')).toBeEnabled();
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
