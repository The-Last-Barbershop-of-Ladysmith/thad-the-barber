import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'booking',
  (): void => {
    test(
      'books the first open slot',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoA11yViolations(page);

        await page.locator('.p-datepicker-day:not(.p-disabled)').first().click();
        await page.getByRole('group').getByRole('button', { disabled: false }).first().click();
        await page.locator('#booking-name').fill('Jordan Customer');
        const phone: Locator = page.locator('#booking-phone');
        // InputMask redraws its buffer on a timer after focus, which can wipe a value filled too soon.
        await expect(async (): Promise<void> => {
          await phone.fill('5405550123');
          await expect(phone).toHaveValue('(540) 555-0123', { timeout: 1_000 });
        }).toPass();
        await page.getByTestId('confirm-booking').click();

        await expect(page.getByTestId('booking-confirmation')).toContainText('(540) 555-0123');
        await expectNoA11yViolations(page);
      },
    );
  },
);
