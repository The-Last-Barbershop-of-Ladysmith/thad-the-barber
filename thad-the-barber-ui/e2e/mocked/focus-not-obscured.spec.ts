import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const PAGES: readonly string[] = [
  '/',
  '/book',
  '/contact',
  '/privacy',
];
const MAX_TAB_STOPS: number = 120;
const DIRECTIONS: readonly string[] = ['Tab', 'Shift+Tab'];

interface FocusedBox {
  isInsideFixedTop: boolean;
  isVisible: boolean;
  top: number;
  description: string;
}

async function readFocusedBox(page: Page): Promise<FocusedBox> {
  return page.evaluate((): FocusedBox => {
    const focused: Element | null = document.activeElement;
    if (focused === null || focused === document.body) {
      return {
        isInsideFixedTop: false,
        isVisible: false,
        top: 0,
        description: 'body',
      };
    }
    const box: DOMRect = focused.getBoundingClientRect();
    return {
      isInsideFixedTop: focused.closest('[data-site-top], .skip-link') !== null,
      isVisible: box.width > 0 && box.height > 0,
      top: box.top,
      description: `${focused.tagName.toLowerCase()}.${focused.className}`,
    };
  });
}

test.describe(
  'focus not obscured',
  (): void => {
    test.use({ reducedMotion: 'reduce' });
    test.skip(({ browserName }: { browserName: string; }): boolean => browserName === 'webkit', 'Safari does not Tab to links unless its setting is turned on');

    for (const path of PAGES) {
      for (const direction of DIRECTIONS) {
        test(
          `${path}: every ${direction} stop sits below the fixed header`,
          async ({ page }: { page: Page; }): Promise<void> => {
            await page.goto(path);
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
            const headerBottom: number = await page.evaluate(
              (): number => document.querySelector('[data-site-top]')?.getBoundingClientRect().bottom ?? 0,
            );
            expect(headerBottom).toBeGreaterThan(0);

            const hidden: string[] = [];
            for (let stop: number = 0; stop < MAX_TAB_STOPS; stop++) {
              await page.keyboard.press(direction);
              const focused: FocusedBox = await readFocusedBox(page);
              if (focused.description === 'body') {
                break;
              }
              if (focused.isVisible && !focused.isInsideFixedTop && focused.top < headerBottom) {
                hidden.push(`${focused.description} at ${focused.top} under header ending ${headerBottom}`);
              }
            }

            expect(hidden).toEqual([]);
          },
        );
      }
    }
  },
);
