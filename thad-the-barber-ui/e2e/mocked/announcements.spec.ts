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

/** Whether the slide with this title sits inside the carousel's own box, side to side, wherever the page is. */
async function isSlideShowing(page: Page, title: string): Promise<boolean> {
  return page.evaluate((slideTitle: string): boolean => {
    const slider: Element | null = document.querySelector('.announcements .slider');
    const slide: Element | undefined = Array.from(document.querySelectorAll('.announcements .slide-title'))
      .find((candidate: Element): boolean => candidate.textContent.includes(slideTitle));
    if (!slider || !slide) {
      return false;
    }
    const sliderBox: DOMRect = slider.getBoundingClientRect();
    const slideBox: DOMRect = slide.getBoundingClientRect();
    return slideBox.left >= sliderBox.left - 1 && slideBox.right <= sliderBox.right + 1;
  }, title);
}

async function openStripOnOlderAnnouncement(page: Page, startPath: string): Promise<string> {
  const olderTitle: string = ACTIVE_ANNOUNCEMENT_TITLES[0] ?? '';
  await page.goto(startPath);
  await expect(page.getByTestId('announcement-strip').locator('.item.is-shown .title')).toHaveText(olderTitle, {
    timeout: 10_000,
  });
  return olderTitle;
}

/** Resolves once the carousel's scrolling track has held still for several frames in a row. */
async function finishScrolling(page: Page): Promise<void> {
  await page.evaluate(async (): Promise<void> => {
    const track: Element | undefined = Array.from(document.querySelectorAll('.announcements .slider *'))
      .find((element: Element): boolean => element.scrollWidth > element.clientWidth);
    const framesToHoldStill: number = 10;
    let stillFrames: number = 0;
    let lastPosition: number = track?.scrollLeft ?? 0;
    while (stillFrames < framesToHoldStill) {
      await new Promise<void>((resolve: () => void): void => {
        requestAnimationFrame((): void => {
          resolve();
        });
      });
      const position: number = track?.scrollLeft ?? 0;
      stillFrames = position === lastPosition ? stillFrames + 1 : 0;
      lastPosition = position;
    }
  });
}

test.describe(
  'announcements',
  (): void => {
    test(
      'shows the active announcements from the media container, newest first, with image, rich text and buttons',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#announcements');

        const section: Locator = page.getByTestId('announcements');
        await expect(section.getByRole('heading', { level: 2 })).toHaveText([...ACTIVE_ANNOUNCEMENT_TITLES].reverse());

        const image: Locator = section.getByTestId('announcement-image');
        await expect(image).toHaveCount(1);
        await expect(image).toHaveAttribute('src', `${MEDIA_BASE_URL}/announcements/e2e%20promo.webp`);
        await expect(image).toHaveAttribute('alt', 'E2E promo photo');
        const naturalWidth: () => Promise<number> = (): Promise<number> =>
          image.evaluate((element: HTMLImageElement): number => element.naturalWidth);
        await expect.poll(naturalWidth).toBeGreaterThan(0);

        const listBody: Locator = section.getByTestId('announcement-body').filter({ has: page.getByRole('listitem') });
        await expect(listBody.getByRole('listitem')).toHaveCount(1);
        await expect(section.locator('a[href="/book"]')).toHaveCount(1);
        await expect(section.locator('a[href="https://example.test/"]')).toHaveAttribute('target', '_blank');

        await expectNoA11yViolations(page);
      },
    );

    test(
      'follows a link to this site in the body without reloading the page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#announcements');
        const link: Locator = page.getByTestId('announcement-body').locator('a[href="/#visit"]');
        await expect(link).toBeAttached();
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
          await expect(page.getByTestId('announcement-strip')).toHaveCount(0);
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

    test(
      'starts the strip on the newest active announcement above the header, on the home and booking pages',
      async ({ page }: { page: Page; }): Promise<void> => {
        const newestTitle: string = ACTIVE_ANNOUNCEMENT_TITLES[1] ?? '';

        for (const path of ['/', '/book']) {
          await page.goto(path);

          const strip: Locator = page.getByTestId('announcement-strip');
          await expect(strip.locator('.item.is-shown .title')).toHaveText(newestTitle);
          const stripBox: { y: number; height: number; } | null = await strip.boundingBox();
          const logoBox: { y: number; } | null = await page.locator('.home-link').boundingBox();
          expect((stripBox?.y ?? 1)).toBe(0);
          expect(logoBox?.y ?? 0).toBeGreaterThanOrEqual((stripBox?.height ?? 0));
        }
      },
    );

    test(
      'opens the home announcements section from the strip on the booking page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');

        await page.getByTestId('announcement-strip').getByRole('link').click();

        await expect(page).toHaveURL('/#announcements');
        await expect(page.getByTestId('announcements')).toBeInViewport();
      },
    );

    test(
      'leaves a section opened from a link clear of the strip and the header',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        await expect(page.getByTestId('announcement-strip')).toBeVisible();

        await page.locator('footer a[href="/#visit"]').click();

        await expect(page).toHaveURL('/#visit');
        let previousScroll: number = -1;
        await expect.poll(
          async (): Promise<boolean> => {
            const scroll: number = await page.evaluate((): number => window.scrollY);
            const isSettled: boolean = scroll === previousScroll;
            previousScroll = scroll;
            return isSettled;
          },
          { intervals: [300] },
        ).toBe(true);
        const headerBox: { y: number; height: number; } | null = await page.locator('app-header .top').boundingBox();
        const sectionBox: { y: number; } | null = await page.locator('#visit').boundingBox();
        expect((sectionBox?.y ?? 0) - ((headerBox?.y ?? 0) + (headerBox?.height ?? 0))).toBeGreaterThanOrEqual(15);
      },
    );

    test(
      'cycles the strip through every active announcement, newest first',
      async ({ page }: { page: Page; }): Promise<void> => {
        const [olderTitle, newestTitle]: string[] = ACTIVE_ANNOUNCEMENT_TITLES;
        await page.goto('/');
        const shown: Locator = page.getByTestId('announcement-strip').locator('.item.is-shown .title');

        await expect(shown).toHaveText(newestTitle ?? '');
        await expect(shown).toHaveText(olderTitle ?? '', { timeout: 10_000 });
      },
    );

    test(
      'offers to resume once the strip is paused',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('announcement-strip-pause').click();

        await expect(page.getByTestId('announcement-strip-pause')).toHaveAccessibleName('Resume announcements');
      },
    );

    test(
      'removes the strip when closed, and the header moves up to the top',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');
        const logoBefore: { y: number; } | null = await page.locator('.home-link').boundingBox();

        await page.getByTestId('announcement-strip-close').click();

        await expect(page.getByTestId('announcement-strip')).toHaveCount(0);
        const logoAfter: { y: number; } | null = await page.locator('.home-link').boundingBox();
        expect(logoAfter?.y ?? Infinity).toBeLessThan(logoBefore?.y ?? 0);
      },
    );

    for (const startPath of ['/', '/book']) {
      test(
        `opens the carousel on the announcement the strip is showing when "Details" is used from ${startPath}`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const olderTitle: string = await openStripOnOlderAnnouncement(page, startPath);

          await page.locator('.item.is-shown a').click();

          await expect.poll(async (): Promise<boolean> => isSlideShowing(page, olderTitle)).toBe(true);
        },
      );
    }

    test(
      'stays on the announcement the strip chose once the carousel has finished scrolling',
      async ({ page }: { page: Page; }): Promise<void> => {
        const olderTitle: string = await openStripOnOlderAnnouncement(page, '/');

        await page.locator('.item.is-shown a').click();
        await expect.poll(async (): Promise<boolean> => isSlideShowing(page, olderTitle)).toBe(true);
        await finishScrolling(page);

        expect(await isSlideShowing(page, olderTitle)).toBe(true);
      },
    );
  },
);
