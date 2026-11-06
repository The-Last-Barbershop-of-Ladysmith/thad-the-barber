import { Locator, Page, Request, Response, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { BookingRequest } from '../../src/app/features/booking/dtos/booking-request.dto';
import { expectNoA11yViolations } from '../support/axe';
import { isBookingRequest, isNextTimesRequest } from '../support/booking';
import { expect, test } from '../support/fixtures';
import { isStaticMap } from '../support/map';
import { servedEnvironment } from '../support/served-environment';

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

test.describe(
  'home next open times',
  (): void => {
    test(
      'shows the next six times, and a tapped one opens the booking page with it picked',
      async ({ page }: { page: Page; }): Promise<void> => {
        const bookings: Request[] = [];
        await page.route(isBookingRequest, async (route: Route): Promise<void> => {
          bookings.push(route.request());
          const body: BookingRequest = route.request().postDataJSON() as BookingRequest;
          const confirmation: BookingConfirmation = {
            id: 'made-up-booking',
            startAt: body.startAt,
            manageToken: 'made-up-manage-token',
          };
          await route.fulfill({ status: 201, json: confirmation });
        });
        const nextTimesLoaded: Promise<Response> = page.waitForResponse((response: Response): boolean =>
          isNextTimesRequest(new URL(response.url())));
        await page.goto('/');
        const startAts: string[] = await (await nextTimesLoaded).json() as string[];

        const timeLinks: Locator = page.getByTestId('next-time');
        await expect(timeLinks).toHaveCount(6);
        await timeLinks.nth(2).click();

        await expect(page).toHaveURL(/\/book$/);
        await page.locator('#booking-name').fill('Jordan Customer');
        await page.locator('#booking-phone').pressSequentially('5405550123');
        await expect(page.getByTestId('confirm-booking')).toBeEnabled();
        await page.getByTestId('confirm-booking').click();
        await expect(page).toHaveURL(/\/book\/manage\/made-up-booking$/);
        const [booking]: Request[] = bookings;
        expect((booking?.postDataJSON() as BookingRequest).startAt).toBe(startAts[2]);
      },
    );

    test(
      'shows the first open time in the hero',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByTestId('next-open-chair')).toBeVisible();
        await expect(page.getByTestId('next-open-chair')).toHaveText(/\d/);
      },
    );

    test(
      'highlights a time and the calendar link on hover',
      async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
        test.skip(isMobile, 'Touch screens have no hover.');
        await page.goto('/');
        const calendarLink: Locator = page.locator('.calendar-link');
        const secondTime: Locator = page.getByTestId('next-time').nth(1);
        const colorOf: (link: Locator) => Promise<string> = (link: Locator): Promise<string> =>
          link.evaluate((element: Element): string => getComputedStyle(element).color);
        const borderOf: (tile: Locator) => Promise<string> = (tile: Locator): Promise<string> =>
          tile.evaluate((element: Element): string => getComputedStyle(element).borderTopColor);
        const linkColorBefore: string = await colorOf(calendarLink);
        const borderBefore: string = await borderOf(secondTime);

        await calendarLink.hover();
        await expect.poll((): Promise<string> => colorOf(calendarLink)).not.toBe(linkColorBefore);
        await secondTime.hover();
        await expect.poll((): Promise<string> => borderOf(secondTime)).not.toBe(borderBefore);
      },
    );

    test(
      'fits every time and the hero time on one line from a small phone to a wide desktop',
      async ({ page }: { page: Page; }): Promise<void> => {
        for (const width of [
          320,
          390,
          768,
          1024,
          1280,
          1920,
        ]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto('/');
          await expect(page.getByTestId('next-time').first()).toBeVisible();

          const overflows: number[] = await page.getByTestId('next-time').evaluateAll((slots: Element[]): number[] =>
            slots.map((slot: Element): number => {
              const style: CSSStyleDeclaration = getComputedStyle(slot);
              const room: number = slot.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
              return (slot.querySelector('.slot-time')?.scrollWidth ?? 0) - room;
            }));
          const heroLines: number = await page.getByTestId('next-open-chair').locator('dt').evaluate((time: Element): number =>
            time.getBoundingClientRect().height / parseFloat(getComputedStyle(time).lineHeight));

          const rowTops: number[] = await page.getByTestId('next-time').evaluateAll((slots: Element[]): number[] =>
            slots.map((slot: Element): number => Math.round(slot.getBoundingClientRect().top)));

          expect(Math.max(...overflows), `a tile's time overflows at ${width}px`).toBeLessThanOrEqual(0);
          if (width >= 1024) {
            expect(new Set(rowTops).size, `the times wrap to a second row at ${width}px`).toBe(1);
          }
          expect(heroLines, `the hero time wraps at ${width}px`).toBeLessThanOrEqual(1.01);
        }
      },
    );

    test(
      "offers a call, a text and Square's booking site when no time can be shown",
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isNextTimesRequest, (route: Route): Promise<void> => route.fulfill({ status: 503 }));
        await page.goto('/');

        const fallback: Locator = page.getByTestId('next-times-missing');
        await expect(fallback).toBeVisible();
        await expect(fallback.locator('a')).toHaveCount(3);
        await expect(page.getByTestId('next-time')).toHaveCount(0);
        await expect(page.getByTestId('next-open-chair')).toHaveCount(0);
      },
    );
  },
);

test.describe(
  'home scroll rail',
  (): void => {
    test.use({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });

    test(
      'follows the section in view, and a tooth scrolls to its section',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        const rail: Locator = page.getByTestId('scroll-rail');
        await expect(rail).toBeVisible();
        await expect(rail.locator('[aria-current="true"]')).toHaveAccessibleName('Top');

        await page.evaluate((): void => document.getElementById('visit')?.scrollIntoView());
        await expect(rail.locator('[aria-current="true"]')).toHaveAccessibleName('Visit');

        await rail.getByRole('link', { name: 'Schedule' }).click();
        await expect(rail.locator('[aria-current="true"]')).toHaveAccessibleName('Schedule');
        await expect(page.locator('#schedule')).toBeInViewport();
      },
    );
  },
);

test.describe(
  'home visit map',
  (): void => {
    test(
      'links the map image to directions in a new tab',
      async ({ page }: { page: Page; }): Promise<void> => {
        test.skip(!servedEnvironment.staticMapApiKey || !servedEnvironment.staticMapId, 'The served build has no map key or ID yet');
        await page.goto('/');

        const map: Locator = page.getByTestId('visit-map');
        await expect(map).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\//);
        await expect(map).toHaveAttribute('target', '_blank');
        await expect(map.locator('img')).toHaveJSProperty('complete', true);
      },
    );

    test(
      'hides the map when the image fails, keeping the rest of the section',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isStaticMap, (route: Route): Promise<void> => route.abort());
        await page.goto('/');

        await expect(page.getByTestId('visit-directions')).toBeVisible();
        await expect(page.getByTestId('visit-phone')).toBeVisible();
        await expect(page.getByTestId('visit-map')).toHaveCount(0);
      },
    );
  },
);
