import { APIResponse, Locator, Page, Route } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const APP_SCRIPT: string = '**/main*.js';

async function holdAppScript(page: Page): Promise<() => Promise<void>> {
  let heldRoute: Route | undefined;
  await page.route(
    APP_SCRIPT,
    (route: Route): void => {
      heldRoute = route;
    },
  );
  return async (): Promise<void> => {
    await expect.poll((): boolean => heldRoute !== undefined).toBe(true);
    await heldRoute?.continue();
  };
}

test.describe(
  'startup loader',
  (): void => {
    test(
      'shows the loader while the app script is held, then removes it once the app renders',
      async ({ page }: { page: Page; }): Promise<void> => {
        const release: () => Promise<void> = await holdAppScript(page);
        await page.goto(
          '/book',
          { waitUntil: 'commit' },
        );
        const loader: Locator = page.locator('#startup-loader');

        await expect(loader).toBeVisible();
        await expect(loader).toHaveAttribute('role', 'status');
        await expect(loader).toContainText('Loading');

        await release();

        await expect(page.getByTestId('find-bookings-link')).toBeVisible();
        await expect(loader).toBeHidden();
      },
    );

    test(
      'never covers a prerendered page',
      async ({ page }: { page: Page; }): Promise<void> => {
        test.skip(!process.env['CI'], 'Only the Express build serves prerendered pages; ng serve sends the empty app shell.');

        await holdAppScript(page);
        await page.goto(
          '/',
          { waitUntil: 'commit' },
        );

        await expect(page.locator('app-root')).not.toBeEmpty();
        await expect(page.locator('#startup-loader')).toBeHidden();
      },
    );

    test(
      'has no spinner animation when the visitor prefers reduced motion',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await holdAppScript(page);
        await page.goto(
          '/book',
          { waitUntil: 'commit' },
        );

        await expect(page.locator('#startup-loader')).toBeVisible();
        await expect(page.locator('#startup-loader .spinner')).toBeHidden();
      },
    );

    test(
      'shows the error message when the bootstrap fails',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(
          (url: URL): boolean => url.pathname === '/book',
          async (route: Route): Promise<void> => {
            const response: APIResponse = await route.fetch();
            const html: string = (await response.text()).replace(
              /<app-root[^>]*><\/app-root>/,
              '<div></div>',
            );
            await route.fulfill({
              response,
              body: html,
            });
          },
        );
        await page.goto('/book');

        await expect(page.locator('#startup-loader .failed')).toBeVisible();
        await expect(page.locator('#startup-loader .spinner')).toBeHidden();
      },
    );
  },
);
