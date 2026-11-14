import { Locator, Page, Response } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
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
      'answers with a 404 status',
      async ({ page }: { page: Page; }): Promise<void> => {
        test.skip(!process.env['CI'], 'Only Express sends the 404; ng serve answers 200.');

        const response: Response | null = await page.goto('/another-missing-page');
        expect(response?.status()).toBe(404);
      },
    );

    test(
      'moves focus to the heading',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      },
    );

    test(
      'links to the Square booking site in a new tab',
      async ({ page }: { page: Page; }): Promise<void> => {
        const square: Locator = page.getByTestId('not-found-square');

        await expect(square).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect(square).toHaveAttribute('target', '_blank');
      },
    );

    test(
      'navigating to an unknown route in the app shows the page without a reload',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/privacy');
        await page.evaluate((): void => {
          history.pushState(
            {},
            '',
            '/another-missing-page',
          );
          dispatchEvent(new PopStateEvent('popstate'));
        });

        await expect(page.getByTestId('not-found')).toBeVisible();
        await expect(page).toHaveURL('/another-missing-page');
      },
    );

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
