import {
  type APIRequestContext,
  type APIResponse,
  type Page,
  expect,
  test,
} from '@playwright/test';

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

function requiredEnv(name: string): string {
  const value: string | undefined = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} to run the smoke suite.`);
  }
  return value;
}

test.describe(
  'smoke',
  (): void => {
    test(
      'the API reports healthy',
      async ({ request }: { request: APIRequestContext; }): Promise<void> => {
        const healthUrl: string = `${requiredEnv('API_BASE_URL')}/health`;
        await expect(async (): Promise<void> => {
          const response: APIResponse = await request.get(healthUrl);
          expect(
            response.status(),
            healthUrl,
          ).toBe(200);
        }).toPass(COLD_START);
      },
    );

    test(
      'the site loads',
      async ({ page }: { page: Page; }): Promise<void> => {
        requiredEnv('BASE_URL');
        await expect(async (): Promise<void> => {
          await page.goto('/');
          await expect(page.getByRole(
            'heading',
            { level: 1 },
          )).toBeVisible();
        }).toPass(COLD_START);
      },
    );
  },
);
