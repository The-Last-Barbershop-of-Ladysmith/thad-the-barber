import {
  ConsoleMessage,
  Locator,
  Page,
  Route,
} from '@playwright/test';
import { ShopInfo } from '../../src/app/core/models/shop/shop-info.model';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { collectPageErrors } from '../support/page-errors';
import { SHOP_URL } from '../support/shop';

/** Angular's hydration and runtime errors are logged with an NG0 code rather than thrown. */
function collectAngularErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage): void => {
    const isAngularError: boolean = message.type() === 'error' && /NG0\d+/.test(message.text());
    if (isAngularError) {
      errors.push(message.text());
    }
  });
  return errors;
}

function phoneLinks(page: Page, shop: ShopInfo): Locator {
  return page.locator(`a[href="tel:${shop.phone}"]`);
}

/** The places that show the phone without opening the mobile menu. */
const PHONE_PLACES: readonly string[] = [
  '#schedule',
  '#visit',
  'footer',
];

test.describe(
  'shop details',
  (): void => {
    test(
      'come from GET /api/shop in the header, schedule, visit section and footer',
      async ({ page }: { page: Page; }): Promise<void> => {
        const angularErrors: string[] = collectAngularErrors(page);
        await page.goto('/');

        for (const place of PHONE_PLACES) {
          await expect(page.locator(place).locator(`a[href="tel:${TEST_SHOP.phone}"]`)).toBeAttached();
        }
        await expect(page.locator('a[href^="https://www.google.com/maps/dir/"][href*="12%20Pretend%20Pl"]')).toHaveCount(2);
        await expect(page.locator('a[href="https://www.instagram.com/made.up%20fades/"]')).toBeAttached();
        await expect(page.locator('a[href="https://www.facebook.com/made-up-fades"]')).toBeAttached();
        await expect(page.locator('#visit iframe')).toHaveAttribute('src', /12%20Pretend%20Pl/);
        await expectNoA11yViolations(page);
        expect(angularErrors).toEqual([]);
      },
    );

    test(
      'follow the fixture when it changes',
      async ({ page }: { page: Page; }): Promise<void> => {
        const changed: ShopInfo = { ...TEST_SHOP, phone: '+15550100177' };
        await page.route(SHOP_URL, (route: Route): Promise<void> => route.fulfill({ json: changed }));

        await page.goto('/');

        await expect(phoneLinks(page, changed).first()).toBeAttached();
        await expect(phoneLinks(page, TEST_SHOP)).toHaveCount(0);
      },
    );

    test(
      'show the saved copy on a repeat visit while the API is down, with no hydration errors',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        await expect(phoneLinks(page, TEST_SHOP).first()).toBeAttached();

        const pageErrors: Error[] = collectPageErrors(page);
        const angularErrors: string[] = collectAngularErrors(page);
        await page.route(SHOP_URL, (route: Route): Promise<void> => route.fulfill({ status: 503 }));
        const failedLoad: Promise<unknown> = page.waitForResponse(SHOP_URL);
        await page.reload();
        await failedLoad;

        await expect(phoneLinks(page, TEST_SHOP).first()).toBeAttached();
        await expect(page.locator('#visit iframe')).toHaveAttribute('src', /12%20Pretend%20Pl/);
        expect(pageErrors).toEqual([]);
        expect(angularErrors).toEqual([]);
      },
    );
  },
);
