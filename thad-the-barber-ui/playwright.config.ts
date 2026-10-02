import {
  type PlaywrightTestConfig,
  type Project,
  defineConfig,
} from '@playwright/test';

const isCi: boolean = !!process.env['CI'];
const baseURL: string = 'http://localhost:4200';

const desktop: Project['use'] = {
  viewport: {
    width: 1280,
    height: 800,
  },
};

const mobile: Project['use'] = {
  viewport: {
    width: 390,
    height: 844,
  },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

/** Mocked-API suite: runs against `ng serve`; the deployed-site smoke suite has its own config. */
const config: PlaywrightTestConfig = defineConfig({
  testDir: './e2e/mocked',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  // The unminified dev server slows down when every worker is busy; a booking run with two axe scans
  // can pass 30 s on WebKit, and a lazy route can take over 5 s.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    [isCi ? 'github' : 'list'],
    [
      'html',
      { open: 'never' },
    ],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        ...desktop,
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        ...mobile,
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        browserName: 'webkit',
        ...desktop,
      },
    },
    {
      name: 'webkit-mobile',
      use: {
        browserName: 'webkit',
        ...mobile,
      },
    },
  ],
  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
});

export default config;
