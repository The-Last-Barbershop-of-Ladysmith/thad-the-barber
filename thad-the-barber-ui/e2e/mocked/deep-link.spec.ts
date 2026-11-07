import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

test.describe(
  'deep link',
  (): void => {
    test(
      'keeps the section just below the header and strip while the page finishes loading',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#visit');
        await expect(page.getByTestId('announcement-strip')).toBeVisible();

        await expect.poll(
          async (): Promise<number> => page.evaluate((): number => {
            const sectionTop: number = document.querySelector('#visit')?.getBoundingClientRect().top ?? -1;
            const headerBottom: number = document.querySelector('[data-site-top]')?.getBoundingClientRect().bottom ?? 0;
            return Math.round(sectionTop - headerBottom);
          }),
          { timeout: 10000 },
        ).toBeLessThanOrEqual(32);
        const gap: number = await page.evaluate((): number => {
          const sectionTop: number = document.querySelector('#visit')?.getBoundingClientRect().top ?? -1;
          const headerBottom: number = document.querySelector('[data-site-top]')?.getBoundingClientRect().bottom ?? 0;
          return sectionTop - headerBottom;
        });
        expect(gap).toBeGreaterThanOrEqual(0);
      },
    );
  },
);
