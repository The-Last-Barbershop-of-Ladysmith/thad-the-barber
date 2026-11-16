import { Page, Route } from '@playwright/test';
import { isNextTimesRequest } from '../support/booking';
import { expect, test } from '../support/fixtures';

const DESKTOP_WIDTHS: readonly number[] = [
  1024,
  1280,
  1440,
  1920,
];

const SCREEN_HEIGHT: number = 900;
const SKELETON_WIDTHS: readonly number[] = [
  320,
  390,
  414,
  448,
  480,
  544,
  640,
  1024,
  1280,
];
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

test.describe(
  'hero facts placeholder',
  (): void => {
    for (const screenWidth of SKELETON_WIDTHS) {
      test(
        `${screenWidth}px: the placeholder is as tall as the facts that replace it`,
        async ({ page }: { page: Page; }): Promise<void> => {
          let releaseNextTimes: () => void = (): void => undefined;
          const nextTimesHeld: Promise<void> = new Promise<void>((release: () => void): void => {
            releaseNextTimes = release;
          });
          await page.route(
            isNextTimesRequest,
            async (route: Route): Promise<void> => {
              await nextTimesHeld;
              await route.fallback();
            },
          );
          await page.setViewportSize({
            width: screenWidth,
            height: SCREEN_HEIGHT,
          });
          await page.goto('/');

          const placeholderHeight: number = await page.getByTestId('next-open-chair-loading')
            .evaluate((placeholder: Element): number => placeholder.getBoundingClientRect().height);
          releaseNextTimes();
          await expect(page.getByTestId('next-open-chair')).toBeVisible();
          const factsHeight: number = await page.locator('.facts')
            .evaluate((facts: Element): number => facts.getBoundingClientRect().height);

          expect(placeholderHeight).toBeCloseTo(factsHeight, 0);
        },
      );
    }
  },
);
