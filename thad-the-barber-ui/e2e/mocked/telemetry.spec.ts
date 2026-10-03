import { Page, Route } from '@playwright/test';
import {
  expect,
  isTelemetryIngestion,
  test,
} from '../support/fixtures';
import { servedEnvironment } from '../support/served-environment';

interface Envelope { data?: { baseType?: string; baseData?: { url?: string; }; }; }

const API_PROBE: string = `${servedEnvironment.apiBaseUrl}/telemetry-probe`;
const SITE_PROBE: string = '/telemetry-probe';
// The SDK batches telemetry for up to 15 s before sending.
const BATCH_TIMEOUT: number = 30_000;

test.describe(
  'telemetry',
  (): void => {
    test(
      'sends one page view per route change, without query strings',
      async ({ page }: { page: Page; }): Promise<void> => {
        const pageViews: string[] = [];
        await page.route(
          isTelemetryIngestion,
          async (route: Route): Promise<void> => {
            const envelopes: Envelope[] = route.request().postDataJSON() as Envelope[];
            envelopes
              .filter((envelope: Envelope): boolean => envelope.data?.baseType === 'PageviewData')
              .forEach((envelope: Envelope): void => {
                const url: URL = new URL(envelope.data?.baseData?.url ?? '');
                pageViews.push(url.pathname + url.search + url.hash);
              });
            await route.fulfill({ status: 200, json: {} });
          },
        );

        // /book renders in the browser, so its heading means the app (and telemetry) has started.
        await page.goto('/book?from=e2e');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.locator('header a[href="/"]').first().click();
        await expect(page).toHaveURL('/');

        await expect.poll((): string[] => pageViews, { timeout: BATCH_TIMEOUT }).toEqual(['/book', '/']);
      },
    );

    test(
      'adds traceparent to API calls only',
      async ({ page }: { page: Page; }): Promise<void> => {
        let apiTraceparent: string | null = null;
        let siteTraceparent: string | null = null;
        await page.route(API_PROBE, async (route: Route): Promise<void> => {
          apiTraceparent = await route.request().headerValue('traceparent');
          await route.fulfill({ status: 204 });
        });
        await page.route(SITE_PROBE, async (route: Route): Promise<void> => {
          siteTraceparent = await route.request().headerValue('traceparent');
          await route.fulfill({ status: 204 });
        });

        await page.goto('/book');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.evaluate(async (urls: string[]): Promise<void> => {
          await Promise.all(urls.map((url: string): Promise<Response> => fetch(url)));
        }, [API_PROBE, SITE_PROBE]);

        expect(apiTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
        expect(siteTraceparent).toBeNull();
      },
    );
  },
);
