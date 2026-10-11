import { Route } from '@playwright/test';
import { GalleryPhoto } from '../../src/app/features/home/models/home.models';
import { servedEnvironment } from './served-environment';

export const MEDIA_BASE_URL: string = servedEnvironment.mediaBaseUrl;

export const GALLERY_LISTING_URL: string = `${MEDIA_BASE_URL}?restype=container&comp=list&prefix=gallery/&delimiter=/`;

export const ANNOUNCEMENTS_URL: string = `${MEDIA_BASE_URL}/content/announcements.json`;

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

/**
 * A local `YYYY-MM-DD` day relative to today: this suite has no fake clock, so announcements are dated around now.
 * (`shared/utils/date.utils` can't be imported here: it loads `@angular/common`, which needs the Angular compiler.)
 */
function daysFromToday(days: number): string {
  const day: Date = new Date();
  day.setDate(day.getDate() + days);
  return [
    day.getFullYear(),
    day.getMonth() + 1,
    day.getDate(),
  ].map((part: number): string => String(part).padStart(2, '0')).join('-');
}

const LONG_TITLE: string = 'E2E special 💈 with a title that runs well past sixty characters on purpose';

/**
 * Made-up announcements: one with every field and a title past the 60-character portal limit, a plain-text one running
 * a day either side of today (so a run across midnight still sees it), and an expired one that never shows.
 */
export const TEST_ANNOUNCEMENTS: { items: object[]; } = {
  items: [
    {
      title: LONG_TITLE,
      bodyHtml: '<p>E2E body with <a href="/#visit">a link to this site</a>.</p><ul><li>E2E item</li></ul>',
      startDate: daysFromToday(-10),
      endDate: daysFromToday(10),
      image: {
        fileName: 'e2e promo.webp',
        altText: 'E2E promo photo',
        position: 'left',
      },
      buttons: [
        {
          label: 'E2E book',
          url: '/book',
          variant: 'primary',
        },
        {
          label: 'E2E elsewhere',
          url: 'https://example.test/',
          variant: 'mystery',
        },
      ],
    },
    {
      title: 'E2E plain post',
      bodyHtml: 'E2E plain text',
      startDate: daysFromToday(-1),
      endDate: daysFromToday(1),
    },
    {
      title: 'E2E expired post',
      startDate: daysFromToday(-20),
      endDate: daysFromToday(-1),
    },
  ],
};

export const ACTIVE_ANNOUNCEMENT_TITLES: string[] = [LONG_TITLE, 'E2E plain post'];

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

/** Lists TEST_GALLERY_FILES for the gallery, serves TEST_ANNOUNCEMENTS, and the same small WebP for every image. */
export async function fulfillMedia(route: Route): Promise<void> {
  const url: string = route.request().url();
  if (url === GALLERY_LISTING_URL) {
    await route.fulfill({ body: galleryListing(TEST_GALLERY_FILES), contentType: 'application/xml' });
  } else if (url === ANNOUNCEMENTS_URL) {
    await route.fulfill({ json: TEST_ANNOUNCEMENTS });
  } else if (url.endsWith('.webp')) {
    // Relative to the working directory, which npm scripts set to the UI folder.
    await route.fulfill({ path: 'e2e/support/media/print.webp', contentType: 'image/webp' });
  } else {
    await route.fulfill({ status: 404 });
  }
}
