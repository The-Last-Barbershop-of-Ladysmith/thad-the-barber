import {
  type Page,
  type Route,
  test as base,
  expect,
} from '@playwright/test';

/**
 * The mocked suite's `page`: any `/api/*` call a test hasn't routed fails the test.
 * Tests mock endpoints with their own `page.route`, which takes precedence over the catch-all.
 * Each test already gets a fresh browser context, so localStorage starts empty.
 * No fake clock: `page.clock` stalls PrimeNG's drawer animation.
 */
export const test: typeof base = base.extend({
  page: async (
    { page }: { page: Page; },
    use: (page: Page) => Promise<void>,
  ): Promise<void> => {
    const unmocked: string[] = [];
    await page.route(
      (url: URL): boolean => url.pathname.startsWith('/api/'),
      async (route: Route): Promise<void> => {
        unmocked.push(`${route.request().method()} ${route.request().url()}`);
        await route.fulfill({ status: 501 });
      },
    );

    await use(page);

    expect(
      unmocked,
      'API calls without a mock',
    ).toEqual([]);
  },
});

export { expect };
