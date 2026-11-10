import { Page } from '@playwright/test';

export function waitAnimationFrames(page: Page, count: number): Promise<void> {
  return page.evaluate((frames: number): Promise<void> => new Promise<void>((resolve: () => void): void => {
    let remaining: number = frames;
    const step: () => void = (): void => {
      remaining--;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }), count);
}
