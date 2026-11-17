import { Locator, Page } from '@playwright/test';
import { Rgba, contrastRatio } from '../../src/testing/contrast';
import { expect, test } from '../support/fixtures';

interface FocusIndicator {
  style: string;
  width: number;
  color: string;
  surroundings: string;
}

interface FocusTarget {
  name: string;
  path: string;
  locate: (page: Page) => Locator;
  isDesktopOnly?: boolean;
  prepare?: (page: Page) => Promise<void>;
  isReachedByTabbing?: boolean;
}

const MINIMUM_WIDTH_PX: number = 2;
const MINIMUM_CONTRAST: number = 3;

function openDays(page: Page): Locator {
  return page.getByTestId('date-picker').locator('td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)');
}

async function pickDay(page: Page): Promise<void> {
  await openDays(page).first().click();
}

async function pickDayAndTime(page: Page): Promise<void> {
  await pickDay(page);
  await page.getByTestId('time-list').locator('[role="button"]').first().click();
}

async function tabToCalendarDay(page: Page): Promise<void> {
  const day: Locator = page.getByTestId('date-picker').locator('.p-datepicker-day:focus');
  for (let presses: number = 0; presses < 30 && (await day.count()) === 0; presses++) {
    await page.keyboard.press('Tab');
  }
}

const TARGETS: readonly FocusTarget[] = [
  {
    name: 'skip link',
    path: '/',
    locate: (page: Page): Locator => page.getByTestId('skip-link'),
  },
  {
    name: 'header nav link',
    path: '/',
    locate: (page: Page): Locator => page.getByTestId('header-nav').getByRole('link').first(),
    isDesktopOnly: true,
  },
  {
    name: 'header Book a cut button',
    path: '/',
    locate: (page: Page): Locator => page.getByTestId('header-book'),
    isDesktopOnly: true,
  },
  {
    name: 'menu toggle',
    path: '/',
    locate: (page: Page): Locator => page.getByTestId('menu-toggle'),
  },
  {
    name: 'hero call button',
    path: '/',
    locate: (page: Page): Locator => page.getByTestId('hero-call'),
  },
  {
    name: 'carousel dot',
    path: '/',
    locate: (page: Page): Locator => page.locator('.p-carousel-indicator-button').first(),
  },
  {
    name: 'calendar day',
    path: '/book',
    prepare: tabToCalendarDay,
    isReachedByTabbing: true,
    locate: (page: Page): Locator => page.getByTestId('date-picker').locator('.p-datepicker-day:focus'),
  },
  {
    name: 'time slot',
    path: '/book',
    prepare: pickDay,
    locate: (page: Page): Locator => page.getByTestId('time-list').locator('[role="button"]').first(),
  },
  {
    name: 'text input',
    path: '/book',
    prepare: pickDayAndTime,
    locate: (page: Page): Locator => page.locator('#booking-name'),
  },
];

async function readIndicator(target: Locator): Promise<FocusIndicator> {
  return target.evaluate((element: Element): FocusIndicator => {
    const style: CSSStyleDeclaration = getComputedStyle(element);
    let surroundings: string = 'rgb(12, 8, 6)';
    let ancestor: Element | null = element.parentElement;
    while (ancestor) {
      const background: string = getComputedStyle(ancestor).backgroundColor;
      const channels: number[] = (background.match(/[\d.]+/gu) ?? []).map(Number);
      const isOpaque: boolean = channels.length === 3 || channels[3] === 1;
      if (isOpaque && background !== 'rgba(0, 0, 0, 0)') {
        surroundings = background;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
      color: style.outlineColor,
      surroundings,
    };
  });
}

function toRgba(color: string): Rgba {
  const channels: number[] = (color.match(/[\d.]+/gu) ?? []).map(Number);
  return {
    red: channels[0] ?? 0,
    green: channels[1] ?? 0,
    blue: channels[2] ?? 0,
    alpha: channels[3] ?? 1,
  };
}

test.describe(
  'keyboard focus indicator',
  (): void => {
    for (const target of TARGETS) {
      test(
        `${target.name} shows an outline of at least ${MINIMUM_WIDTH_PX}px with ${MINIMUM_CONTRAST}:1 contrast`,
        async ({ page, isMobile }: { page: Page; isMobile: boolean | undefined; }): Promise<void> => {
          test.skip(!!target.isDesktopOnly && !!isMobile, 'The mobile header swaps this control for the menu toggle');
          test.skip(target.name === 'menu toggle' && !isMobile, 'Only the mobile header has the menu toggle');
          await page.goto(target.path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await target.prepare?.(page);
          const control: Locator = target.locate(page);
          if (!target.isReachedByTabbing) {
            await page.keyboard.press('Tab');
            await control.focus();
          }
          await expect(control).toBeFocused();
          await control.evaluate(
            (element: Element): Promise<Animation[]> => Promise.all(
              element.getAnimations().map((animation: Animation): Promise<Animation> => animation.finished),
            ),
          );

          const indicator: FocusIndicator = await readIndicator(control);

          expect(indicator.style).not.toBe('none');
          expect(indicator.width).toBeGreaterThanOrEqual(MINIMUM_WIDTH_PX);
          const ratio: number = contrastRatio(toRgba(indicator.color), toRgba(indicator.surroundings));
          expect(ratio).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
        },
      );
    }
  },
);
