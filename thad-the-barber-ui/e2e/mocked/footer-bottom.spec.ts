import { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

// The 404 page fills a full screen by design, so on a tall screen it is already taller than the screen.
const SHORT_PAGES: string[] = [
  '/accessibility',
  '/book/manage',
  '/contact',
];

const TALL_SCREEN_HEIGHT: number = 2400;

test.describe(
  'footer at the bottom of a tall screen',
  (): void => {
    for (const path of SHORT_PAGES) {
      test(
        `${path} ends with the footer at the bottom, with no gap under it`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const viewportWidth: number = page.viewportSize()?.width ?? 1280;
          await page.setViewportSize({ width: viewportWidth, height: TALL_SCREEN_HEIGHT });

          await page.goto(path);
          const footer: Locator = page.locator('footer');
          await expect(footer).toBeVisible();

          // At least the screen's height: no gap under the footer. It is not pinned to the exact pixel because desktop
          // WebKit resolves `100svh` a little taller than the window it reports.
          await expect.poll(
            async (): Promise<number> => {
              const box: { y: number; height: number; } | null = await footer.boundingBox();
              return Math.round((box?.y ?? 0) + (box?.height ?? 0));
            },
            { message: 'the footer\'s bottom edge, in pixels from the top of the screen' },
          ).toBeGreaterThanOrEqual(TALL_SCREEN_HEIGHT);
        },
      );
    }
  },
);
