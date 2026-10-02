import {
  type PlaywrightTestConfig,
  defineConfig,
} from '@playwright/test';

/**
 * Smoke suite against a deployed site: `BASE_URL` is the web app and `API_BASE_URL` the API
 * (the web app doesn't proxy `/api`).
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: './e2e/smoke',
  // An F1 app can take a couple of minutes to wake from a cold start.
  timeout: 240_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [
    [process.env['CI'] ? 'github' : 'list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: 'playwright-report/smoke',
      },
    ],
  ],
  outputDir: 'test-results/smoke',
  use: {
    baseURL: process.env['BASE_URL'],
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});

export default config;
