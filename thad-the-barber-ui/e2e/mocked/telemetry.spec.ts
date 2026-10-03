import {
  Page,
  Request,
  Route,
} from '@playwright/test';
import { environment as development } from '../../src/environments/environment.development';
import { environment as testEnvironment } from '../../src/environments/environment.test';
import { expect, test } from '../support/fixtures';

interface Envelope { data?: { baseType?: string; baseData?: { url?: string; }; }; }

// CI serves the `test` build; locally `ng serve` runs the `development` one.
const API_BASE_URL: string = process.env['CI'] ? testEnvironment.apiBaseUrl : development.apiBaseUrl;
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
          (url: URL): boolean => url.pathname === '/v2/track',
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
        const traceparents: Record<string, string | undefined> = {};
        const record: (route: Route) => Promise<void> = async (route: Route): Promise<void> => {
          const request: Request = route.request();
          traceparents[new URL(request.url()).pathname] = await request.headerValue('traceparent') ?? undefined;
          await route.fulfill({ status: 204 });
        };
        await page.route(`${API_BASE_URL}/telemetry-probe`, record);
        await page.route('/telemetry-probe', record);

        await page.goto('/book');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.evaluate(async (apiBaseUrl: string): Promise<void> => {
          await fetch(`${apiBaseUrl}/telemetry-probe`);
          await fetch('/telemetry-probe');
        }, API_BASE_URL);

        expect(traceparents[`${new URL(API_BASE_URL).pathname}/telemetry-probe`]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
        expect(traceparents['/telemetry-probe']).toBeUndefined();
      },
    );
  },
);
