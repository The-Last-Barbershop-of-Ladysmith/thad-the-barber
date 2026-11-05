import { Locator, Page } from '@playwright/test';
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

    test(
      'the sidebar list scrolls to a section and marks it as the one being read',
      async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
        test.skip(isMobile, 'Phones get the collapsible box instead of the sidebar.');
        await page.goto('/privacy');

        await page.getByTestId('privacy-toc').locator('a[href$="#stats"]').click();

        await expect(page.locator('#stats')).toBeInViewport();
        await expect(page.getByTestId('privacy-toc').locator('[aria-current="location"]')).toHaveAttribute(
          'href',
          '/privacy#stats',
        );
      },
    );

    test(
      'the phone box opens and scrolls to a section',
      async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
        test.skip(!isMobile, 'Desktop gets the sidebar instead of the box.');
        await page.goto('/privacy');
        const box: Locator = page.getByTestId('privacy-toc-box');

        await expect(box.locator('a[href$="#stats"]')).toBeHidden();
        await box.locator('summary').click();
        await box.locator('a[href$="#stats"]').click();

        await expect(page.locator('#stats')).toBeInViewport();
      },
    );
  },
);
