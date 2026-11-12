import { Route } from '@playwright/test';
import { GalleryPhoto } from '../../src/app/features/gallery/models/gallery-photo.model';
import { MEDIA_BASE_URL } from './media';
import { servedEnvironment } from './served-environment';

export const GALLERY_URL: string = `${servedEnvironment.apiBaseUrl}/gallery`;

export const TEST_GALLERY: GalleryPhoto[] = [
  {
    src: `${MEDIA_BASE_URL}/gallery/e2e-newer-print.webp`,
    alt: 'E2e newer print',
  },
  {
    src: `${MEDIA_BASE_URL}/gallery/e2e-older_print.webp`,
    alt: 'E2e older print',
  },
];

export function isGalleryRequest(url: URL): boolean {
  return url.href === GALLERY_URL;
}

export async function fulfillGallery(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_GALLERY });
}
