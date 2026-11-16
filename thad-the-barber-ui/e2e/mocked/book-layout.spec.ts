import { Locator, Page } from '@playwright/test';
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

const FOLLOW_UP_WIDTHS: readonly number[] = [
  390,
  768,
  1280,
];

test.describe(
  'booking page layout once the first step is done',
  (): void => {
    for (const screenWidth of FOLLOW_UP_WIDTHS) {
      test(
        `${screenWidth}px: the form shrinks to the open step instead of leaving a gap above the footer`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({
            width: screenWidth,
            height: SCREEN_HEIGHT,
          });
          await page.goto('/book');
          const openDays: Locator = page.getByTestId('date-picker')
            .locator('td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)');

          await openDays.first().click();
          await expect(page.getByTestId('time-list')).toBeVisible();

          await expect(async (): Promise<void> => {
            const formHeight: number = await page.locator('form')
              .evaluate((form: Element): number => form.getBoundingClientRect().height);
            const stepperHeight: number = await page.locator('p-stepper')
              .evaluate((stepper: Element): number => stepper.getBoundingClientRect().height);
            expect(formHeight - stepperHeight).toBeLessThanOrEqual(1);
          }).toPass();
        },
      );
    }
  },
);

test.describe(
  'booking page layout while the stepper loads',
  (): void => {
    for (const screenWidth of SCREEN_WIDTHS) {
      test(
        `${screenWidth}px: the form holds its height, so the footer never moves up and moves down by less than a few lines`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({
            width: screenWidth,
            height: SCREEN_HEIGHT,
          });
          await page.addInitScript((frameCount: number): void => {
            const footerDistances: number[] = [];
            (window as unknown as { footerTops: number[]; }).footerTops = footerDistances;
            const sampleFooterTop: () => void = (): void => {
              const footer: Element | null = document.querySelector('footer');
              const form: Element | null = document.querySelector('form');
              if (footer && form && footerDistances.length < frameCount) {
                footerDistances.push(footer.getBoundingClientRect().top - form.getBoundingClientRect().top);
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
