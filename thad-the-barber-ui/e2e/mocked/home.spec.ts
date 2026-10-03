import { Locator, Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';

const SECTIONS: readonly string[] = [
  'announcements',
  'schedule',
  'visit',
  'testimonials',
  'gallery',
];

test.describe(
  'home',
  (): void => {
    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.goto('/');
      // The prerendered hero shows before the app starts; until its first NavigationEnd a menu opened now would close.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test(
      'renders every section',
      async ({ page }: { page: Page; }): Promise<void> => {
        for (const id of SECTIONS) {
          await expect(page.locator(`#${id}`)).toBeAttached();
        }
        await expectNoA11yViolations(page);
      },
    );

    test.describe(
      'nav',
      (): void => {
        // While the drawer slides in, a tap can land on its mask and close it.
        // PrimeNG skips the slide under reduced motion.
        test.use({ reducedMotion: 'reduce' });

        test(
          'nav links scroll to their section',
          async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
            for (const id of SECTIONS) {
              if (isMobile) {
                await page.getByTestId('menu-toggle').click();
              }
              const nav: Locator = page.getByTestId(isMobile ? 'drawer-nav' : 'header-nav');
              await nav.locator(`a[href="/#${id}"]`).click();

              await expect(page).toHaveURL(`/#${id}`);
              await expect(page.locator(`#${id}`)).toBeInViewport();
            }
          },
        );
      },
    );
  },
);
