import { Page, Response } from '@playwright/test';
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
