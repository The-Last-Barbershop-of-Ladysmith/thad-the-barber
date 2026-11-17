import { Locator, Page, Route } from '@playwright/test';
import { isShopRequest } from '../support/shop';
import { expect, test } from '../support/fixtures';

/** Holds the shop request open, so the "Loading hours" pill stays on the screen. */
async function holdShopRequest(page: Page): Promise<() => void> {
  let release: () => void = (): void => undefined;
  const held: Promise<void> = new Promise<void>((resolve: () => void): void => {
    release = resolve;
  });
  await page.route(isShopRequest, async (route: Route): Promise<void> => {
    await held;
    await route.fallback();
  });
  return release;
}

async function animationName(dot: Locator): Promise<string> {
  return dot.evaluate((element: Element): string => getComputedStyle(element).animationName);
}

test.describe(
  'loading hours animation',
  (): void => {
    test.describe(
      'with motion allowed',
      (): void => {
        test.use({ reducedMotion: 'no-preference' });

        test(
          'the dot animates while the hours load, then the open/closed pill shows',
          async ({ page }: { page: Page; }): Promise<void> => {
            const release: () => void = await holdShopRequest(page);

            await page.goto('/');
            const loading: Locator = page.getByTestId('open-status-loading');
            await expect(loading).toBeVisible();
            expect(await animationName(loading.locator('.status-dot'))).toMatch(/hours-loading$/);

            release();
            await expect(page.getByTestId('open-status')).toBeVisible();
            await expect(loading).toHaveCount(0);
          },
        );
      },
    );

    test.describe(
      'with reduced motion',
      (): void => {
        test.use({ reducedMotion: 'reduce' });

        test(
          'the dot stays still while the hours load',
          async ({ page }: { page: Page; }): Promise<void> => {
            const release: () => void = await holdShopRequest(page);

            await page.goto('/');
            const loading: Locator = page.getByTestId('open-status-loading');
            await expect(loading).toBeVisible();
            expect(await animationName(loading.locator('.status-dot'))).toBe('none');

            release();
          },
        );
      },
    );
  },
);
