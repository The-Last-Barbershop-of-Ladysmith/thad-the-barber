import { Page } from '@playwright/test';

export const NO_AVIF_REASON: string = 'This browser build cannot decode AVIF, so the backdrop never draws.';

export function canDecodeAvif(page: Page): Promise<boolean> {
  return page.evaluate(async (): Promise<boolean> => {
    const image: HTMLImageElement = new Image();
    image.src = 'assets/keys/404.avif';
    try {
      await image.decode();
      return true;
    } catch {
      return false;
    }
  });
}
