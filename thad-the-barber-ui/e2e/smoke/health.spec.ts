import {
  APIRequestContext,
  APIResponse,
  Page,
  expect,
  test,
} from '@playwright/test';
import { environment } from '../../src/environments/environment.development';

const COLD_START: {
  intervals: number[];
  timeout: number;
} = {
  intervals: [
    5_000,
    10_000,
    15_000,
  ],
  timeout: 180_000,
};

const apiBaseUrl: string = process.env['API_BASE_URL'] ?? environment.apiBaseUrl;

test.describe(
  'smoke',
  (): void => {
    test(
      'the API reports healthy',
      async ({ request }: { request: APIRequestContext; }): Promise<void> => {
        const healthUrl: string = `${apiBaseUrl}/health`;
        await expect(async (): Promise<void> => {
          const response: APIResponse = await request.get(healthUrl);
          expect(response.status(), healthUrl).toBe(200);
        }).toPass(COLD_START);
      },
    );

    test(
      'the site loads',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expect(async (): Promise<void> => {
          await page.goto('/');
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        }).toPass(COLD_START);
      },
    );
  },
);
