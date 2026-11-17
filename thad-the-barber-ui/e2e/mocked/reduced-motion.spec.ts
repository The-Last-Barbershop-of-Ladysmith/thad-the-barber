import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const SCROLL_STEPS: number = 6;

async function readRunningAnimations(page: Page): Promise<string[]> {
  return page.evaluate((): string[] => document.getAnimations()
    .filter((animation: Animation): boolean => animation.playState === 'running')
    .map((animation: Animation): string => {
      const target: Element | null = (animation.effect as KeyframeEffect | null)?.target ?? null;
      return `${animation.constructor.name} on ${target?.tagName.toLowerCase()}.${target?.className}`;
    }));
}

test.describe(
  'reduced motion on the home page',
  (): void => {
    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test(
      'keeps the key home content and passes axe',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expect(page.getByTestId('hero-book')).toBeVisible();
        await expect(page.getByTestId('announcement-strip')).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'jumps to a section instead of scrolling smoothly',
      async ({ page }: { page: Page; }): Promise<void> => {
        const scrollBehavior: string = await page.evaluate(
          (): string => getComputedStyle(document.documentElement).scrollBehavior,
        );

        expect(scrollBehavior).toBe('auto');
      },
    );

    test(
      'runs no animation or transition while the page is scrolled to the bottom',
      async ({ page }: { page: Page; }): Promise<void> => {
        for (let step: number = 1; step <= SCROLL_STEPS; step++) {
          await page.evaluate(
            (fraction: number): void => {
              window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * fraction);
            },
            step / SCROLL_STEPS,
          );
          await page.evaluate((): Promise<number> => new Promise<number>(requestAnimationFrame));
        }

        expect(await readRunningAnimations(page)).toEqual([]);
      },
    );

    test(
      'fades announcements without sliding them',
      async ({ page }: { page: Page; }): Promise<void> => {
        const item: Locator = page.getByTestId('announcement-strip').locator('.crossfade-item').first();

        await expect(item).toHaveCSS('transition-property', 'none');
      },
    );

    test(
      'shows the first backdrop frame and keeps it while scrolling',
      async ({ page }: { page: Page; }): Promise<void> => {
        const canvas: Locator = page.locator('app-backdrop canvas');
        const snapshot: () => Promise<string> = (): Promise<string> =>
          canvas.evaluate((element: HTMLCanvasElement): string => element.toDataURL());
        await expect.poll(async (): Promise<number> => (await snapshot()).length).toBeGreaterThan(1000);
        const before: string = await snapshot();

        await page.evaluate((): void => {
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await page.evaluate((): Promise<number> => new Promise<number>(requestAnimationFrame));
        await page.evaluate((): Promise<number> => new Promise<number>(requestAnimationFrame));

        expect(await snapshot()).toBe(before);
      },
    );
  },
);
