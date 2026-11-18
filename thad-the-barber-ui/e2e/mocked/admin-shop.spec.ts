import { Page, Route } from '@playwright/test';
import { AdminShopInfoDto } from '../../src/app/features/admin/shop/dtos/admin-shop-info.dto';
import {
  ADMIN_SESSION_URL,
  ADMIN_SHOP_URL,
  MockedShopInfo,
  adminSession,
  fulfillProblem,
  mockAdminShop,
  mockGoogleSignIn,
} from '../support/admin';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const SQUARE_ONLY: AdminShopInfoDto = {
  notice: null,
  isNoticeShown: true,
  squareNotice: 'Read before booking.',
};

/** Signs in, then opens the shop info page by its menu link: a full page load would drop the in-memory token. */
async function signInAndOpenShop(page: Page): Promise<void> {
  await mockGoogleSignIn(page);
  await page.route(
    (url: URL): boolean => url.href === ADMIN_SESSION_URL,
    async (route: Route): Promise<void> => {
      await route.fulfill({ json: adminSession() });
    },
  );
  await page.goto('/admin');
  await page.locator('#google-stub-button').click();
  await expect(page).toHaveURL(/\/admin\/overview$/);
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Shop info' }).click();
  await expect(page).toHaveURL(/\/admin\/shop$/);
}

test.describe(
  'admin shop info',
  (): void => {
    test(
      'shows the Square text until the owner writes their own, and saves it',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedShopInfo = await mockAdminShop(page, SQUARE_ONLY);
        await signInAndOpenShop(page);

        await expect(page.getByTestId('square-notice')).toContainText('Read before booking.');
        await expectNoA11yViolations(page);
        await page.getByLabel('Notice', { exact: true }).fill('Closed Monday for repairs.');
        await page.getByTestId('save-shop').click();

        await expect(page.getByTestId('shop-saved')).toBeVisible();
        expect(mocked.saves).toEqual([{ notice: 'Closed Monday for repairs.', isNoticeShown: true }]);
      },
    );

    test(
      'turns the notice off and saves the switch',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mocked: MockedShopInfo = await mockAdminShop(page, SQUARE_ONLY);
        await signInAndOpenShop(page);

        await page.getByTestId('notice-shown').uncheck();
        await expect(page.getByTestId('notice-hidden')).toBeVisible();
        await page.getByTestId('save-shop').click();

        await expect(page.getByTestId('shop-saved')).toBeVisible();
        expect(mocked.saves).toEqual([{ notice: null, isNoticeShown: false }]);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'says so when the shop info cannot be reached',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(
          (url: URL): boolean => url.href === ADMIN_SHOP_URL,
          (route: Route): Promise<void> => fulfillProblem(
            route,
            503,
            'shop_info_unavailable',
          ),
        );
        await signInAndOpenShop(page);

        await expect(page.getByTestId('shop-error')).toContainText('could not be reached');
        await expectNoA11yViolations(page);
      },
    );
  },
);
