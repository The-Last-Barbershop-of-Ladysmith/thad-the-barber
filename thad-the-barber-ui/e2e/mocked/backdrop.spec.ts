import { Page, Request, Response } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { waitAnimationFrames } from '../support/frames';

const BYTES_PER_MEGABYTE: number = 1024 * 1024;
const DESKTOP_BUDGET_MEGABYTES: number = 8;
const PHONE_BUDGET_MEGABYTES: number = 4;
const SCROLL_STEP_VIEWPORTS: number = 0.5;
const BACKDROP_PATH: string = '/assets/backdrop/';

/** Several browsers share one dev server in a local run, so draining the frame requests can take a while. */
const DRAIN_TIMEOUT_MILLISECONDS: number = 30_000;

interface BackdropDownload {
  url: string;
  bytes: number;
}

test.describe(
  'backdrop',
  (): void => {
    test(
      'downloads only its own variant, within the byte budget, over a full slow scroll',
      async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
        const variant: string = isMobile ? 'phone' : 'desktop';
        const budgetMegabytes: number = isMobile ? PHONE_BUDGET_MEGABYTES : DESKTOP_BUDGET_MEGABYTES;
        const sizes: Promise<BackdropDownload>[] = [];
        let pendingRequests: number = 0;
        const isBackdropRequest: (request: Request) => boolean = (request: Request): boolean =>
          request.url().includes(BACKDROP_PATH);
        page.on(
          'request',
          (request: Request): void => {
            if (isBackdropRequest(request)) {
              pendingRequests++;
            }
          },
        );
        page.on(
          'requestfinished',
          (request: Request): void => {
            if (isBackdropRequest(request)) {
              pendingRequests--;
            }
          },
        );
        page.on(
          'response',
          (response: Response): void => {
            if (response.url().includes(BACKDROP_PATH)) {
              sizes.push(response.body().then((body: Buffer): BackdropDownload => ({
                url: response.url(),
                bytes: body.length,
              })));
            }
          },
        );

        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const viewportHeight: number = page.viewportSize()?.height ?? 0;
        const reachedBottom: () => Promise<boolean> = (): Promise<boolean> =>
          page.evaluate((): boolean =>
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1);
        while (!(await reachedBottom())) {
          await page.mouse.wheel(0, viewportHeight * SCROLL_STEP_VIEWPORTS);
          // The backdrop reacts to a scroll in the next animation frame, so let that pass before counting.
          await waitAnimationFrames(page, 2);
          await expect.poll((): number => pendingRequests, { timeout: DRAIN_TIMEOUT_MILLISECONDS }).toBe(0);
        }

        const downloads: BackdropDownload[] = await Promise.all(sizes);
        const totalBytes: number = downloads.reduce(
          (sum: number, download: BackdropDownload): number => sum + download.bytes,
          0,
        );

        expect(downloads.length).toBeGreaterThan(0);
        expect(downloads.every((download: BackdropDownload): boolean =>
          download.url.includes(`${BACKDROP_PATH}${variant}/`))).toBe(true);
        expect(totalBytes).toBeLessThanOrEqual(budgetMegabytes * BYTES_PER_MEGABYTE);
      },
    );
  },
);
