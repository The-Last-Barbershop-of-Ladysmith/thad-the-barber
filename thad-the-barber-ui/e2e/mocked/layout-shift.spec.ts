import { Page, Route } from '@playwright/test';
import { expect, test } from '../support/fixtures';

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface ObservedWindow {
  observedShifts: number[];
}

const PHONE_WIDTHS: readonly number[] = [
  360,
  412,
];
const PHONE_HEIGHT: number = 800;
const MAX_TOTAL_SHIFT: number = 0.02;

const SHIFT_PAGES: readonly string[] = [
  '/',
  '/book',
];

async function observeShifts(page: Page): Promise<void> {
  await page.addInitScript((): void => {
    const observedWindow: ObservedWindow = window as unknown as ObservedWindow;
    observedWindow.observedShifts = [];
    new PerformanceObserver((list: PerformanceObserverEntryList): void => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          observedWindow.observedShifts.push(entry.value);
        }
      }
    }).observe({
      type: 'layout-shift',
      buffered: true,
    });
  });
}

async function totalShift(page: Page): Promise<number> {
  const shifts: number[] = await page.evaluate((): number[] => (window as unknown as ObservedWindow).observedShifts);
  return shifts.reduce((total: number, shift: number): number => total + shift, 0);
}

test.describe(
  'layout shift while the page loads',
  (): void => {
    test.skip(
      ({ browserName }: { browserName: string; }): boolean => browserName !== 'chromium',
      'Only Chromium reports layout shifts',
    );

    for (const isApiDown of [false, true]) {
      for (const screenWidth of PHONE_WIDTHS) {
        for (const path of SHIFT_PAGES) {
          test(
            `${path} at ${screenWidth}px with the API ${isApiDown ? 'down' : 'up'} stays put`,
            async ({ page }: { page: Page; }): Promise<void> => {
              await page.setViewportSize({
                width: screenWidth,
                height: PHONE_HEIGHT,
              });
              if (isApiDown) {
                await page.route(
                  (url: URL): boolean => url.pathname.startsWith('/api/'),
                  (route: Route): Promise<void> => route.abort(),
                );
              }
              await observeShifts(page);

              await page.goto(path);
              await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
              await page.waitForLoadState('networkidle');
              await page.evaluate((): Promise<void> => new Promise((resolve: () => void): void => {
                requestAnimationFrame((): number => requestAnimationFrame(resolve));
              }));

              expect(await totalShift(page)).toBeLessThanOrEqual(MAX_TOTAL_SHIFT);
            },
          );
        }
      }
    }
  },
);
