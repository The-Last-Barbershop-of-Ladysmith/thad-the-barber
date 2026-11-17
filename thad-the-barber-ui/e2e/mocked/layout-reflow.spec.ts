import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const PAGES: readonly string[] = [
  '/',
  '/book',
  '/contact',
  '/privacy',
];
const TEXT_ZOOM_PAGES: readonly string[] = [
  '/',
  '/book',
  '/contact',
  '/privacy',
];
const TEXT_ZOOM_PERCENT: number = 200;

async function readHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate((): number => document.documentElement.scrollWidth - window.innerWidth);
}

async function readClippedContentCount(page: Page): Promise<number> {
  return page.evaluate(
    (): number => [...document.querySelectorAll('main *')].filter(
      (element: Element): boolean => {
        const box: DOMRect = element.getBoundingClientRect();
        return box.width > 0 && box.right > window.innerWidth + 1 && !element.closest('.p-carousel');
      },
    ).length,
  );
}

test.describe(
  'reflow and text size',
  (): void => {
    for (const path of PAGES) {
      test(
        `${path}: nothing scrolls sideways at 320 px wide`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({ width: 320, height: 640 });
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

          expect(await readHorizontalOverflow(page)).toBeLessThanOrEqual(0);
        },
      );
    }

    for (const path of TEXT_ZOOM_PAGES) {
      test(
        `${path}: nothing scrolls sideways with text at ${TEXT_ZOOM_PERCENT}%`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await page.evaluate(
            (percent: number): void => {
              document.documentElement.style.fontSize = `${percent}%`;
            },
            TEXT_ZOOM_PERCENT,
          );

          expect(await readHorizontalOverflow(page)).toBeLessThanOrEqual(0);
          expect(await readClippedContentCount(page)).toBe(0);
        },
      );
    }
  },
);
