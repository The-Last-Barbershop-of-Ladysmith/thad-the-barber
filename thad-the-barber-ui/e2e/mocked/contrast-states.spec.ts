import { Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'contrast in interactive states',
  (): void => {
    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.goto('/book');
      await expect(page.getByTestId('date-picker')).toBeVisible();
    });

    test(
      'passes with a day hovered',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.getByTestId('date-picker').locator('td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)').first().hover();

        await expectNoA11yViolations(page);
      },
    );

    test(
      'passes with a day and a time picked, and a field focused',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.getByTestId('date-picker').locator('td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)').first().click();
        await page.getByTestId('time-list').locator('[role="button"]').first().click();
        await page.locator('#booking-name').focus();

        await expectNoA11yViolations(page);
      },
    );
  },
);
