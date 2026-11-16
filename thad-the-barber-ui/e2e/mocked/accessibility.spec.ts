import { Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'accessibility page',
  (): void => {
    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/accessibility');
        await expect(page.getByTestId('accessibility')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );
  },
);
