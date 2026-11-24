import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { tabUntilFocused } from '../support/keyboard';

async function openDetailsStep(page: Page): Promise<void> {
  await page.goto('/book');
  await page.locator('[data-testid="date-picker"] .p-datepicker-day:not(.p-disabled)').first().click();
  await page.locator('[data-testid="time-list"] [role="button"]').first().click();
  await expect(page.locator('#booking-name')).toBeVisible();
}

test.describe(
  'booking details errors',
  (): void => {
    test(
      'explains an empty name and phone once each is left, linked to its field, and clears them when fixed',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openDetailsStep(page);
        const name: Locator = page.locator('#booking-name');
        const phone: Locator = page.locator('#booking-phone');
        await expect(page.locator('#booking-name-error')).toHaveCount(0);
        await expect(name).toHaveAttribute('aria-required', 'true');
        await expect(phone).toHaveAttribute('aria-required', 'true');

        await tabUntilFocused(page, '#booking-name');
        await page.keyboard.press('Tab');
        await expect(page.locator('#booking-name-error')).toHaveAttribute('role', 'alert');
        await expect(name).toHaveAttribute('aria-invalid', 'true');
        await expect(name).toHaveAttribute('aria-describedby', 'booking-name-error');
        await expect(phone).toBeFocused();
        await expect(page.getByTestId('confirm-booking')).toBeDisabled();

        await page.keyboard.press('Tab');
        await expect(page.locator('#booking-phone-error')).toHaveAttribute('role', 'alert');
        await expect(phone).toHaveAttribute('aria-invalid', 'true');
        await expect(phone).toHaveAttribute('aria-describedby', /booking-phone-hint booking-phone-error/);
        await expectNoA11yViolations(page);

        await name.fill('Jordan Customer');
        await expect(page.locator('#booking-name-error')).toHaveCount(0);
        await expect(name).not.toHaveAttribute('aria-invalid', 'true');
      },
    );

    test(
      'labels name and phone with a hidden asterisk, a note saying what it means, and autofill purposes',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openDetailsStep(page);

        await expect(page.getByTestId('details-required-note')).toBeVisible();
        await expect(page.locator('label[for="booking-name"] .required-mark')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.locator('label[for="booking-phone"] .required-mark')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.locator('#booking-name')).toHaveAttribute('autocomplete', 'name');
        await expect(page.locator('#booking-phone')).toHaveAttribute('autocomplete', 'tel');
        await expect(page.locator('#booking-phone')).toHaveAttribute('inputmode', 'tel');
      },
    );
  },
);
