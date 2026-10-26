import { Locator, Page, Request, Response, Route } from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { ACTIVE_ANNOUNCEMENT_TITLES, ANNOUNCEMENTS_URL, GALLERY_LISTING_URL, MEDIA_BASE_URL } from '../support/media';
import { collectPageErrors } from '../support/page-errors';

interface ReloadMarker { e2eNoReload?: boolean; }

const HIDING_RESPONSES: Record<string, Parameters<Route['fulfill']>[0]> = {
  'JSON that does not parse': { body: '{ "items": [', contentType: 'application/json' },
  'a file without an items list': { json: [{ title: 'E2E bare array' }] },
  'only expired announcements': {
    json: {
      items: [
        {
          title: 'E2E old',
          startDate: '2001-01-01',
          endDate: '2001-01-02',
        },
      ],
    },
  },
  'a missing file': { status: 404 },
};

test.describe(
  'announcements',
  (): void => {
    test(
      'shows the active announcements from the media container, with image, rich text and buttons',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#announcements');

        const section: Locator = page.getByTestId('announcements');
        await expect(section.getByRole('heading', { level: 2 })).toHaveText(ACTIVE_ANNOUNCEMENT_TITLES);

        const image: Locator = section.getByTestId('announcement-image');
        await expect(image).toHaveCount(1);
        await expect(image).toHaveAttribute('src', `${MEDIA_BASE_URL}/announcements/e2e%20promo.webp`);
        await expect(image).toHaveAttribute('alt', 'E2E promo photo');
        const naturalWidth: () => Promise<number> = (): Promise<number> =>
          image.evaluate((element: HTMLImageElement): number => element.naturalWidth);
        await expect.poll(naturalWidth).toBeGreaterThan(0);

        const firstBody: Locator = section.getByTestId('announcement-body').first();
        await expect(firstBody.getByRole('listitem')).toHaveCount(1);
        await expect(section.locator('a[href="/book"]')).toHaveCount(1);
        await expect(section.locator('a[href="https://example.test/"]')).toHaveAttribute('target', '_blank');

        await expectNoA11yViolations(page);
      },
    );

    test(
      'follows a link to this site in the body without reloading the page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#announcements');
        const link: Locator = page.getByTestId('announcement-body').first().locator('a[href="/#visit"]');
        await expect(link).toBeVisible();
        await page.evaluate((): void => {
          (window as ReloadMarker).e2eNoReload = true;
        });

        await link.click();

        await expect(page).toHaveURL('/#visit');
        await expect(page.locator('#visit')).toBeInViewport();
        expect(await page.evaluate((): boolean | undefined => (window as ReloadMarker).e2eNoReload)).toBe(true);
      },
    );

    for (const [problem, response] of Object.entries(HIDING_RESPONSES)) {
      test(
        `hides the section and its nav links for ${problem}, and the rest of the page still works`,
        async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
          const pageErrors: Error[] = collectPageErrors(page);
          await page.route(ANNOUNCEMENTS_URL, (route: Route): Promise<void> => route.fulfill(response));
          const loaded: Promise<Response> = page.waitForResponse(ANNOUNCEMENTS_URL);

          await page.goto('/');
          await loaded;

          await expect(page.locator('#visit')).toBeVisible();
          await expect(page.getByTestId('announcements')).toHaveCount(0);
          const nav: Locator = isMobile ? page.locator('footer') : page.getByTestId('header-nav');
          await expect(nav.locator('a[href="/#visit"]')).toHaveCount(1);
          await expect(nav.locator('a[href="/#announcements"]')).toHaveCount(0);
          expect(pageErrors).toEqual([]);
        },
      );
    }

    test(
      'loads on the booking page too, hiding its footer link when none are active, and never lists the gallery there',
      async ({ page }: { page: Page; }): Promise<void> => {
        const mediaRequests: string[] = [];
        page.on('request', (request: Request): void => {
          mediaRequests.push(request.url());
        });
        await page.route(ANNOUNCEMENTS_URL, (route: Route): Promise<void> =>
          route.fulfill(HIDING_RESPONSES['only expired announcements']));
        const loaded: Promise<Response> = page.waitForResponse(ANNOUNCEMENTS_URL);

        await page.goto('/book');
        await loaded;

        const footer: Locator = page.locator('footer');
        await expect(footer.locator('a[href="/#visit"]')).toHaveCount(1);
        await expect(footer.locator('a[href="/#announcements"]')).toHaveCount(0);
        expect(mediaRequests).not.toContain(GALLERY_LISTING_URL);
      },
    );

    test(
      'hides the announcements and the gallery when the media container is down',
      async ({ page }: { page: Page; }): Promise<void> => {
        const pageErrors: Error[] = collectPageErrors(page);
        const mediaFiles: string[] = [ANNOUNCEMENTS_URL, GALLERY_LISTING_URL];
        for (const url of mediaFiles) {
          await page.route(url, (route: Route): Promise<void> => route.fulfill({ status: 503 }));
        }
        const responses: Promise<Response[]> = Promise.all(mediaFiles.map(
          (url: string): Promise<Response> => page.waitForResponse(url),
        ));

        await page.goto('/');
        await responses;

        await expect(page.locator('#visit')).toBeVisible();
        await expect(page.getByTestId('announcements')).toHaveCount(0);
        await expect(page.getByTestId('gallery')).toHaveCount(0);
        expect(pageErrors).toEqual([]);
      },
    );
  },
);
