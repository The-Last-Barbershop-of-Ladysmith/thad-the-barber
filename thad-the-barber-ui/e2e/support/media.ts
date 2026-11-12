import { Route } from '@playwright/test';
import { servedEnvironment } from './served-environment';

export const MEDIA_BASE_URL: string = servedEnvironment.mediaBaseUrl;

export function isMedia(url: URL): boolean {
  return url.href.startsWith(MEDIA_BASE_URL);
}

/** The same small WebP for every image the API points at in storage. */
export async function fulfillMedia(route: Route): Promise<void> {
  if (route.request().url().endsWith('.webp')) {
    // Relative to the working directory, which npm scripts set to the UI folder.
    await route.fulfill({ path: 'e2e/support/media/print.webp', contentType: 'image/webp' });
  } else {
    await route.fulfill({ status: 404 });
  }
}
