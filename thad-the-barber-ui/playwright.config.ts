import {
  PlaywrightTestConfig,
  Project,
  defineConfig,
} from '@playwright/test';
import { environment } from './src/environments/environment.development';

const isCi: boolean = !!process.env['CI'];
const baseURL: string = environment.siteUrl;

const desktop: Project['use'] = { viewport: { width: 1280, height: 800 } };

const mobile: Project['use'] = {
  viewport: { width: 390, height: 844 },
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
    ['html', { open: 'never' }],
    // Read by `npm run e2e:summary` for the CI job summary and PR comment.
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', ...desktop } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', ...mobile } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', ...desktop } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', ...mobile } },
  ],
  webServer: {
    // CI tests what deploys: the optimized build served by Express, with its CSP header and real 404s. The ui job
    // builds it (locally, run `npm run build:express:test` first).
    command: isCi ? 'npm --prefix ../thad-the-barber-express start' : 'npm start',
    env: { PORT: new URL(baseURL).port },
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
});

export default config;
