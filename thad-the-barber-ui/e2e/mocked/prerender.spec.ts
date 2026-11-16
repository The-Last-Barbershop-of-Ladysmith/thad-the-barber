import { Page } from '@playwright/test';
import { SHOP_FALLBACK } from '../../src/app/core/config/shop-info';
import { expect, test } from '../support/fixtures';
import { collectAngularErrors, collectPageErrors } from '../support/page-errors';

const PRERENDERED_PATHS: readonly string[] = [
  '/',
  '/book',
];

test.describe(
  'prerendered pages',
  (): void => {
    test.skip(!process.env['CI'], 'Only the Express build serves prerendered pages; ng serve renders in the browser.');

    test.describe(
      'without JavaScript',
      (): void => {
        test.use({ javaScriptEnabled: false });

        for (const path of PRERENDERED_PATHS) {
          test(
            `${path} already holds the heading, the shop name and the phone link`,
            async ({ page }: { page: Page; }): Promise<void> => {
              await page.goto(path);

              await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
              await expect(page.locator('body')).toContainText(SHOP_FALLBACK.name);
              await expect(page.locator(`a[href="tel:${SHOP_FALLBACK.phone}"]`).first()).toBeAttached();
            },
          );
        }
      },
    );

    for (const path of PRERENDERED_PATHS) {
      test(
        `${path} hydrates with no Angular or page errors`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const pageErrors: Error[] = collectPageErrors(page);
          const angularErrors: string[] = collectAngularErrors(page);

          await page.goto(path);
          await expect(page.locator('app-root[ng-version]')).toBeAttached();
          await page.waitForLoadState('networkidle');

          expect(pageErrors).toEqual([]);
          expect(angularErrors).toEqual([]);
        },
      );
    }
  },
);
