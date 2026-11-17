import { Page, Route } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { ANNOUNCEMENTS_URL } from '../support/announcements';
import { FocusStop, expectedTabStops, tabThrough } from '../support/focus-order';
import { GALLERY_URL } from '../support/gallery';
import { REVIEWS_URL } from '../support/reviews';

async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('announcements')).toBeAttached();
  await expect(page.getByTestId('testimonials')).toBeVisible();
  await expect(page.getByTestId('gallery')).toBeVisible();
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate((): number => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe(
  'home accessibility',
  (): void => {
    test.describe(
      'axe on every home state',
      (): void => {
        test(
          'with announcements, reviews and photos',
          async ({ page }: { page: Page; }): Promise<void> => {
            await openHome(page);

            await expectNoA11yViolations(page);
          },
        );

        test(
          'without announcements',
          async ({ page }: { page: Page; }): Promise<void> => {
            await page.route(ANNOUNCEMENTS_URL, (route: Route): Promise<void> => route.fulfill({ json: [] }));
            await page.goto('/');
            await expect(page.getByTestId('gallery')).toBeVisible();

            await expect(page.getByTestId('announcements')).toHaveCount(0);
            await expect(page.getByTestId('announcement-strip')).toHaveCount(0);
            await expectNoA11yViolations(page);
          },
        );

        test(
          'with the lightbox open',
          async ({ page }: { page: Page; }): Promise<void> => {
            await openHome(page);
            await page.getByTestId('gallery').getByRole('button').first().click();
            await expect(page.getByTestId('lightbox-count')).toBeVisible();

            await expectNoA11yViolations(page);
          },
        );

        test(
          'with no photos and no reviews',
          async ({ page }: { page: Page; }): Promise<void> => {
            await page.route(GALLERY_URL, (route: Route): Promise<void> => route.fulfill({ json: [] }));
            await page.route(REVIEWS_URL, (route: Route): Promise<void> => route.fulfill({ status: 503 }));
            await page.goto('/');

            await expect(page.getByTestId('gallery-empty')).toBeVisible();
            await expect(page.getByTestId('testimonials-empty')).toBeVisible();
            await expectNoA11yViolations(page);
          },
        );
      },
    );

    test(
      'tab reaches every control in page order, each with a visible focus ring',
      async ({ page, browserName }: { page: Page; browserName: string; }): Promise<void> => {
        test.skip(browserName === 'webkit', 'Safari does not tab to links unless the user turns that setting on');
        await openHome(page);
        const expectedStops: string[] = await expectedTabStops(page);

        const stops: FocusStop[] = await tabThrough(page, expectedStops.length);

        expect(stops.map((stop: FocusStop): string => stop.description)).toEqual(expectedStops);
        for (const stop of stops) {
          const hasOutline: boolean = stop.outlineStyle !== 'none' && stop.outlineWidth >= 2;
          expect(hasOutline, `focus ring on ${stop.description}`).toBe(true);
        }
      },
    );

    test(
      'tab past the last control leaves the page instead of trapping focus',
      async ({ page, browserName }: { page: Page; browserName: string; }): Promise<void> => {
        test.skip(browserName === 'webkit', 'Safari does not tab to links unless the user turns that setting on');
        await openHome(page);
        const expectedStops: string[] = await expectedTabStops(page);
        await tabThrough(page, expectedStops.length);

        const [stopAfterLast]: FocusStop[] = await tabThrough(page, 1);

        expect(stopAfterLast?.description).not.toBe(expectedStops.at(-1));
      },
    );

    for (const width of [320, 360]) {
      test(
        `${width} px wide scrolls vertically only`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await page.setViewportSize({ width, height: 800 });
          await openHome(page);

          expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        },
      );
    }

    test(
      'text enlarged to 200% stays inside the page width',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.addInitScript((): void => {
          document.documentElement.style.fontSize = '200%';
        });
        await page.setViewportSize({ width: 1280, height: 800 });
        await openHome(page);

        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      },
    );
  },
);
