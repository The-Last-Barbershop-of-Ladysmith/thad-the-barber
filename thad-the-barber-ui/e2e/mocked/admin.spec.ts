import { Page, Request, Route } from '@playwright/test';
import {
  ADMIN_CONFIG_URL,
  ADMIN_EMAIL,
  ADMIN_NAME,
  ADMIN_SESSION_URL,
  adminSession,
  fulfillProblem,
  mockGoogleSignIn,
  inAdminMenu,
  openAdminMenu,
} from '../support/admin';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

async function signInWithGoogle(page: Page): Promise<void> {
  await page.goto('/admin');
  await expect(page.getByTestId('google-button')).toBeVisible();
  await page.locator('#google-stub-button').click();
}

test.describe(
  'admin sign-in',
  (): void => {
    test(
      'signs in with Google and reaches the overview, in a frame of its own',
      async ({ page }: { page: Page; }): Promise<void> => {
        const sessionRequests: Request[] = [];
        await mockGoogleSignIn(page);
        await page.route(
          (url: URL): boolean => url.href === ADMIN_SESSION_URL,
          async (route: Route): Promise<void> => {
            sessionRequests.push(route.request());
            await route.fulfill({ json: adminSession() });
          },
        );

        await page.goto('/admin');
        await expect(page.getByRole('heading', { level: 1, name: 'Keep the site fresh.' })).toBeVisible();
        await expectNoA11yViolations(page);
        await page.locator('#google-stub-button').click();

        await expect(page).toHaveURL(/\/admin\/overview$/);
        await openAdminMenu(page);
        await expect(inAdminMenu(page, 'admin-name')).toHaveText(ADMIN_NAME);
        await expect(inAdminMenu(page, 'admin-email')).toHaveText(ADMIN_EMAIL);
        await expect(page.getByTestId('admin-heading')).toBeVisible();
        expect(sessionRequests).toHaveLength(1);
        expect(sessionRequests[0]?.postDataJSON()).toEqual({ idToken: 'e2e-google-id-token' });
        // The public header, strip and footer stay out of the admin area.
        await expect(page.locator('app-header')).toHaveCount(0);
        await expect(page.locator('app-footer')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'says a Google account that is not allowed is not authorized, and stays on the sign-in page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);
        await page.route(
          (url: URL): boolean => url.href === ADMIN_SESSION_URL,
          (route: Route): Promise<void> => fulfillProblem(
            route,
            403,
            'not_authorized',
          ),
        );

        await signInWithGoogle(page);

        await expect(page.getByTestId('admin-sign-in-message')).toContainText('can’t manage this site');
        await expect(page).toHaveURL(/\/admin$/);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'says admin sign-in is not set up, with no Google button, when the API says so',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(
          (url: URL): boolean => url.href === ADMIN_CONFIG_URL,
          (route: Route): Promise<void> => fulfillProblem(
            route,
            503,
            'admin_unavailable',
          ),
        );

        await page.goto('/admin');

        await expect(page.getByTestId('admin-sign-in-message')).toContainText('isn’t set up');
        await expect(page.getByTestId('google-button')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'sends anyone who opens an admin page without signing in to the sign-in page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);

        await page.goto('/admin/overview');

        await expect(page).toHaveURL(/\/admin$/);
        await expect(page.getByTestId('google-button')).toBeVisible();
      },
    );

    test(
      'signs out back to the sign-in page, and the overview is closed again',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);
        await page.route(
          (url: URL): boolean => url.href === ADMIN_SESSION_URL,
          async (route: Route): Promise<void> => {
            await route.fulfill({ json: adminSession() });
          },
        );
        await signInWithGoogle(page);
        await expect(page).toHaveURL(/\/admin\/overview$/);

        await openAdminMenu(page);
        await inAdminMenu(page, 'admin-sign-out').click();

        await expect(page).toHaveURL(/\/admin$/);
        await expect(page.getByTestId('google-button')).toBeVisible();
        await page.goto('/admin/overview');
        await expect(page).toHaveURL(/\/admin$/);
      },
    );

    test(
      'stays signed in through a reload of the page, until signing out',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);
        await page.route(
          (url: URL): boolean => url.href === ADMIN_SESSION_URL,
          async (route: Route): Promise<void> => {
            await route.fulfill({ json: adminSession() });
          },
        );
        await signInWithGoogle(page);
        await expect(page).toHaveURL(/\/admin\/overview$/);

        await page.reload();

        await expect(page).toHaveURL(/\/admin\/overview$/);
        await openAdminMenu(page);
        await expect(inAdminMenu(page, 'admin-email')).toHaveText(ADMIN_EMAIL);

        await inAdminMenu(page, 'admin-sign-out').click();
        await page.goto('/admin/overview');
        await expect(page).toHaveURL(/\/admin$/);
      },
    );

    test(
      'shows it is getting Google sign-in ready until the button is there',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);

        await page.goto('/admin');

        await expect(page.getByTestId('google-button')).toBeVisible();
        await expect(page.getByTestId('admin-sign-in-loading')).toHaveCount(0);
      },
    );

    test(
      'is kept out of search engines',
      async ({ page }: { page: Page; }): Promise<void> => {
        await mockGoogleSignIn(page);

        await page.goto('/admin');

        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      },
    );
  },
);
