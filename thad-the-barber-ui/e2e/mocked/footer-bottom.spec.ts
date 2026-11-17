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
        `${path} ends with the footer flush with the bottom, with no scrolling`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const viewportWidth: number = page.viewportSize()?.width ?? 1280;
          await page.setViewportSize({ width: viewportWidth, height: TALL_SCREEN_HEIGHT });

          await page.goto(path);
          const footer: Locator = page.locator('footer');
          await expect(footer).toBeVisible();

          await expect.poll(
            async (): Promise<number> => {
              const box: { y: number; height: number; } | null = await footer.boundingBox();
              return Math.round((box?.y ?? 0) + (box?.height ?? 0));
            },
            { message: 'the footer\'s bottom edge, in pixels from the top of the screen' },
          ).toBe(TALL_SCREEN_HEIGHT);
          const scrollHeight: number = await page.evaluate((): number => document.documentElement.scrollHeight);
          expect(scrollHeight).toBe(TALL_SCREEN_HEIGHT);
        },
      );
    }
  },
);
