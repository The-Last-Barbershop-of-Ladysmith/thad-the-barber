import { Page, Response } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const FORCED_ERROR: string = '/_test/error';

test.describe(
  'error page',
  (): void => {
    // Express renders it; playwright.config.ts turns the forced-error route on for the CI server.
    test.skip(!process.env['CI'], 'Only Express serves the error page; ng serve has no server errors.');

    let response: Response | null;

    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      response = await page.goto(FORCED_ERROR);
    });

    test(
      'answers with the status, a request ID and no error details',
      async ({ page }: { page: Page; }): Promise<void> => {
        expect(response?.status()).toBe(500);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByTestId('error-request-id')).toHaveText(/^[0-9a-f]{32}$/);
        await expect(page.getByTestId('error-details')).toHaveCount(0);
      },
    );

    test(
      'uses the theme from brand.css',
      async ({ page }: { page: Page; }): Promise<void> => {
        const themeBackground: string = await page.evaluate((): string => {
          const probe: HTMLElement = document.createElement('div');
          probe.style.backgroundColor = 'var(--p-surface-950)';
          document.body.append(probe);
          return getComputedStyle(probe).backgroundColor;
        });

        expect(themeBackground).not.toBe('rgba(0, 0, 0, 0)');
        await expect(page.locator('body')).toHaveCSS('background-color', themeBackground);
        await expect(page.getByRole('img')).toHaveJSProperty('complete', true);
      },
    );

    test(
      'try again reloads the page and the home link goes home',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expect(page.getByTestId('error-retry')).toHaveAttribute('href', FORCED_ERROR);
        await page.getByTestId('error-home').click();
        await expect(page).toHaveURL('/');
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expectNoA11yViolations(page);
      },
    );
  },
);
