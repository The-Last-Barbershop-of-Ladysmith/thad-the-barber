import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

test(
  'serves every photo size the title band offers',
  async ({ page }: { page: Page; }): Promise<void> => {
    await page.goto('/privacy');
    const srcset: string = await page.getByTestId('title-band-photo').getAttribute('srcset') ?? '';
    const candidates: string[] = srcset.split(',').map((candidate: string): string => candidate.trim().split(' ')[0] ?? '');

    expect(candidates.length).toBeGreaterThan(1);
    for (const candidate of candidates) {
      const response: Awaited<ReturnType<Page['request']['get']>> = await page.request.get(candidate);

      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/avif');
    }
  },
);
