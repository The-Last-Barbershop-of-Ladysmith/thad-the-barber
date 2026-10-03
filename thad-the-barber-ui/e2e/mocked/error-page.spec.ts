import { Page, Response } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

test.describe(
  'error page',
  (): void => {
    test.skip(!process.env['CI'], 'Only Express serves the error page; ng serve has no server errors.');

    let response: Response | null;

    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      response = await page.goto('/_test/error');
    });

    test(
      'renders a thrown error with the theme from brand.css and links home',
      async ({ page }: { page: Page; }): Promise<void> => {
        expect(response?.status()).toBe(500);
        const themeBackground: string = await page.evaluate((): string => {
          const probe: HTMLElement = document.createElement('div');
          probe.style.backgroundColor = 'var(--p-surface-950)';
          document.body.append(probe);
          return getComputedStyle(probe).backgroundColor;
        });
        expect(themeBackground).not.toBe('rgba(0, 0, 0, 0)');
        await expect(page.locator('body')).toHaveCSS('background-color', themeBackground);
        await expect(page.getByRole('img')).toHaveJSProperty('complete', true);

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
