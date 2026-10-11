import { Route } from '@playwright/test';
import { GalleryContent } from '../../src/app/features/home/models/home.models';
import { servedEnvironment } from './served-environment';

export const MEDIA_BASE_URL: string = servedEnvironment.mediaBaseUrl;

/** Made-up photos: one narrower than every variant (srcset lists only sm), one wider than lg. */
export const TEST_GALLERY: GalleryContent = {
  photos: [
    {
      id: 'e2e-narrow',
      image: 'e2e-narrow',
      alt: 'Test print, narrow',
      width: 300,
      height: 400,
    },
    {
      id: 'e2e-wide',
      image: 'e2e-wide',
      alt: 'Test print, wide',
      width: 2400,
      height: 1800,
    },
  ],
};

export function isMedia(url: URL): boolean {
  return url.href.startsWith(`${MEDIA_BASE_URL}/`);
}

/** Serves TEST_GALLERY as `content/gallery.json` and the same small WebP for every image variant. */
export async function fulfillMedia(route: Route): Promise<void> {
  const path: string = route.request().url().slice(MEDIA_BASE_URL.length);
  if (path === '/content/gallery.json') {
    await route.fulfill({ json: TEST_GALLERY });
  } else if (path.endsWith('.webp')) {
    // Relative to the working directory, which npm scripts set to the UI folder.
    await route.fulfill({ path: 'e2e/support/media/print.webp', contentType: 'image/webp' });
  } else {
    await route.fulfill({ status: 404 });
  }
}
