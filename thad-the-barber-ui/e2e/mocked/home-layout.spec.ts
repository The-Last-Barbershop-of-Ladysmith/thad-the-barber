import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const DESKTOP_WIDTHS: readonly number[] = [
  1024,
  1280,
  1440,
  1920,
];

const SCREEN_HEIGHT: number = 900;
const MIN_GUTTER_PIXELS: number = 16;
const MAX_GUTTER_PIXELS: number = 48;
const GUTTER_VIEWPORT_SHARE: number = 0.04;
const COLUMN_WIDTH_PIXELS: number = 1280;

/** The side padding of a home section: the mock's 4vw gutter, widening once the screen passes the centred column. */
const expectedGutter: (screenWidth: number) => number = (screenWidth: number): number =>
  Math.max(
    Math.min(MAX_GUTTER_PIXELS, Math.max(MIN_GUTTER_PIXELS, screenWidth * GUTTER_VIEWPORT_SHARE)),
    (screenWidth - COLUMN_WIDTH_PIXELS) / 2,
  );

test.describe(
  'home layout on desktop',
  (): void => {
    for (const screenWidth of DESKTOP_WIDTHS) {
      test(
        `${screenWidth}px: sections use the mock gutter and column, and the scroll rail sits clear of them`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({
            width: screenWidth,
            height: SCREEN_HEIGHT,
          });
          await page.goto('/');
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

          const sectionPadding: { left: number; right: number; } = await page.locator('#hours > *').first()
            .evaluate((section: Element): { left: number; right: number; } => {
              const style: CSSStyleDeclaration = getComputedStyle(section);
              return {
                left: parseFloat(style.paddingLeft),
                right: parseFloat(style.paddingRight),
              };
            });
          const railBox: { x: number; width: number; } | null = await page.getByTestId('scroll-rail').boundingBox();

          expect(sectionPadding.left).toBeCloseTo(expectedGutter(screenWidth), 0);
          expect(sectionPadding.right).toBeCloseTo(expectedGutter(screenWidth), 0);
          expect(railBox).not.toBeNull();
          expect((railBox?.x ?? 0) + (railBox?.width ?? 0)).toBeLessThanOrEqual(screenWidth);
          expect(railBox?.x ?? 0).toBeGreaterThanOrEqual(screenWidth - sectionPadding.right);
        },
      );
    }
  },
);
