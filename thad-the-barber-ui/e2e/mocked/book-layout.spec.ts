import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const SCREEN_HEIGHT: number = 900;
const SCREEN_WIDTHS: readonly number[] = [
  320,
  390,
  414,
  480,
  640,
  768,
  1023,
  1024,
  1280,
  1920,
];
const FOOTER_TOP_SAMPLE_FRAMES: number = 90;
const MAX_FOOTER_SHIFT_PIXELS: number = 48;

test.describe(
  'booking page layout while the stepper loads',
  (): void => {
    for (const screenWidth of SCREEN_WIDTHS) {
      test(
        `${screenWidth}px: the footer never moves up and moves down by less than a few lines`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({
            width: screenWidth,
            height: SCREEN_HEIGHT,
          });
          await page.addInitScript((frameCount: number): void => {
            const footerTops: number[] = [];
            (window as unknown as { footerTops: number[]; }).footerTops = footerTops;
            const sampleFooterTop: () => void = (): void => {
              const footer: Element | null = document.querySelector('footer');
              if (footer && footerTops.length < frameCount) {
                footerTops.push(footer.getBoundingClientRect().top);
              }
              requestAnimationFrame(sampleFooterTop);
            };
            requestAnimationFrame(sampleFooterTop);
          }, FOOTER_TOP_SAMPLE_FRAMES);

          await page.goto('/book');
          await expect(page.locator('p-stepper')).toBeVisible();
          await page.waitForFunction(
            (frameCount: number): boolean =>
              (window as unknown as { footerTops: number[]; }).footerTops.length >= frameCount,
            FOOTER_TOP_SAMPLE_FRAMES,
          );

          const footerTops: number[] = await page.evaluate(
            (): number[] => (window as unknown as { footerTops: number[]; }).footerTops,
          );
          const firstTop: number = footerTops[0] ?? 0;
          const highestTop: number = Math.min(...footerTops);
          const lowestTop: number = Math.max(...footerTops);

          expect(firstTop - highestTop).toBeLessThanOrEqual(1);
          expect(lowestTop - firstTop).toBeLessThanOrEqual(MAX_FOOTER_SHIFT_PIXELS);
        },
      );
    }
  },
);
