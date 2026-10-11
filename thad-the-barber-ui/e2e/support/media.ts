import { Route } from '@playwright/test';
import { GalleryPhoto } from '../../src/app/features/home/models/home.models';
import { servedEnvironment } from './served-environment';

export const MEDIA_BASE_URL: string = servedEnvironment.mediaBaseUrl;

export const GALLERY_LISTING_URL: string = `${MEDIA_BASE_URL}?restype=container&comp=list&prefix=gallery/&delimiter=/`;

interface ListedFile {
  name: string;
  lastModified: string;
}

/** Made-up uploads, listed oldest first so the page has to sort them; the HEIC file is skipped. */
const TEST_GALLERY_FILES: ListedFile[] = [
  { name: 'e2e-older_print.webp', lastModified: 'Thu, 01 Oct 2026 10:00:00 GMT' },
  { name: 'e2e-phone-photo.heic', lastModified: 'Fri, 02 Oct 2026 10:00:00 GMT' },
  { name: 'e2e-newer-print.webp', lastModified: 'Sat, 03 Oct 2026 10:00:00 GMT' },
];

/** What the gallery should show for TEST_GALLERY_FILES, newest first. */
export const TEST_GALLERY: GalleryPhoto[] = [{ src: `${MEDIA_BASE_URL}/gallery/e2e-newer-print.webp`, alt: 'E2e newer print' }, { src: `${MEDIA_BASE_URL}/gallery/e2e-older_print.webp`, alt: 'E2e older print' }];

export function galleryListing(files: ListedFile[]): string {
  const blobs: string = files
    .map((file: ListedFile): string =>
      `<Blob><Name>gallery/${file.name}</Name><Properties><Last-Modified>${file.lastModified}</Last-Modified></Properties></Blob>`)
    .join('');
  return `<?xml version="1.0" encoding="utf-8"?><EnumerationResults><Prefix>gallery/</Prefix><Blobs>${blobs}</Blobs><NextMarker /></EnumerationResults>`;
}

export function isMedia(url: URL): boolean {
  return url.href.startsWith(MEDIA_BASE_URL);
}

/** Lists TEST_GALLERY_FILES for the gallery and serves the same small WebP for every image. */
export async function fulfillMedia(route: Route): Promise<void> {
  const url: string = route.request().url();
  if (url === GALLERY_LISTING_URL) {
    await route.fulfill({ body: galleryListing(TEST_GALLERY_FILES), contentType: 'application/xml' });
  } else if (url.endsWith('.webp')) {
    // Relative to the working directory, which npm scripts set to the UI folder.
    await route.fulfill({ path: 'e2e/support/media/print.webp', contentType: 'image/webp' });
  } else {
    await route.fulfill({ status: 404 });
  }
}
