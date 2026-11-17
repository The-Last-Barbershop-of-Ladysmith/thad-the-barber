import { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

test.describe(
  'header menu drawer',
  (): void => {
    test.use({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });

    test.skip(({ browserName }: { browserName: string; }): boolean => browserName === 'webkit', 'Safari does not Tab to buttons or links unless its setting is turned on');

    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test(
      'the toggle says whether the menu is open',
      async ({ page }: { page: Page; }): Promise<void> => {
        const toggle: Locator = page.getByTestId('menu-toggle');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await toggle.focus();
        await page.keyboard.press('Enter');

        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      },
    );

    test(
      'opens as a named modal dialog and keeps Tab inside it',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.getByTestId('menu-toggle').focus();
        await page.keyboard.press('Enter');
        const drawer: Locator = page.getByRole('dialog', { name: 'Menu' });

        await expect(drawer).toBeVisible();
        await expect(drawer).toHaveAttribute('aria-modal', 'true');

        const visited: Set<string> = new Set<string>();
        for (let stop: number = 0; stop < 12; stop++) {
          await page.keyboard.press('Tab');
          await expect(drawer.locator(':focus')).toHaveCount(1);
          visited.add(await page.evaluate((): string => document.activeElement?.getAttribute('href') ?? document.activeElement?.getAttribute('aria-label') ?? ''));
        }

        expect(visited.size).toBeGreaterThan(3);
      },
    );

    test(
      'Escape closes it and returns focus to the toggle',
      async ({ page }: { page: Page; }): Promise<void> => {
        const toggle: Locator = page.getByTestId('menu-toggle');
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      },
    );
  },
);
