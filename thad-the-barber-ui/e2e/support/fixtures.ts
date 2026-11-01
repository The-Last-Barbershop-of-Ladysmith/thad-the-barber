import { Page, Route, test as base, expect } from '@playwright/test';
import { fulfillAvailability, fulfillManagedBooking, isAvailabilityRequest, isManagedBookingRequest } from './booking';
import { fulfillMedia, isMedia } from './media';
import { fulfillRecaptcha, fulfillSession, isRecaptchaScript, isSessionRequest } from './session';
import { fulfillShop, isShopRequest } from './shop';

interface CspReporter { reportCspViolation: (violation: string) => void; }

export function isTelemetryIngestion(url: URL): boolean {
  return url.pathname === '/v2/track';
}

/**
 * The mocked suite's `page`: any `/api/*` call a test hasn't routed fails the test, and so does any CSP violation.
 * Telemetry is accepted and dropped, so test runs never reach App Insights, and the media container serves the
 * made-up gallery in `media.ts`. Google's reCAPTCHA script is a stub and `/api/session` issues a made-up token
 * (`session.ts`), since every API call needs a session token. `GET /api/shop` returns the made-up shop in
 * `src/testing/test-shop.ts` (`shop.ts`), availability opens every day from today, and any booking asked for by ID is
 * upcoming (`booking.ts`).
 * Tests mock endpoints with their own `page.route`, which takes precedence over the catch-all.
 * Each test already gets a fresh browser context, so localStorage starts empty.
 * No fake clock: `page.clock` stalls PrimeNG's drawer animation.
 */
export const test: typeof base = base.extend({
  page: async ({ page }: { page: Page; }, use: (page: Page) => Promise<void>): Promise<void> => {
    const unmocked: string[] = [];
    await page.route(
      (url: URL): boolean => url.pathname.startsWith('/api/'),
      async (route: Route): Promise<void> => {
        unmocked.push(`${route.request().method()} ${route.request().url()}`);
        await route.fulfill({ status: 501 });
      },
    );

    await page.route(isTelemetryIngestion, (route: Route): Promise<void> => route.fulfill({ status: 200, json: {} }));
    await page.route(isMedia, fulfillMedia);
    await page.route(isRecaptchaScript, fulfillRecaptcha);
    await page.route(isSessionRequest, fulfillSession);
    await page.route(isShopRequest, fulfillShop);
    await page.route(isAvailabilityRequest, fulfillAvailability);
    await page.route(isManagedBookingRequest, fulfillManagedBooking);

    const cspViolations: string[] = [];
    await page.exposeFunction('reportCspViolation', (violation: string): void => {
      cspViolations.push(violation);
    });
    await page.addInitScript((): void => {
      document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent): void => {
        (window as unknown as CspReporter).reportCspViolation(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'}`);
      });
    });

    await use(page);

    expect(unmocked, 'API calls without a mock').toEqual([]);
    expect(cspViolations, 'CSP violations').toEqual([]);
  },
});

export { expect };
