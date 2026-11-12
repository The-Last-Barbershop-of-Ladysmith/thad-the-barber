import { Route } from '@playwright/test';
import { AnnouncementDto } from '../../src/app/features/announcements/dtos/announcement.dto';
import {
  AnnouncementImagePosition,
} from '../../src/app/features/announcements/models/announcement-image-position.model';
import { GalleryPhotoDto } from '../../src/app/features/gallery/dtos/gallery-photo.dto';
import { ButtonVariant } from '../../src/app/shared/models/button.models';
import { servedEnvironment } from './served-environment';

export const MEDIA_BASE_URL: string = servedEnvironment.mediaBaseUrl;

export const GALLERY_URL: string = `${servedEnvironment.apiBaseUrl}/gallery`;

export const ANNOUNCEMENTS_URL: string = `${servedEnvironment.apiBaseUrl}/announcements`;

/** What `GET /api/gallery` returns for two made-up uploads: newest first, the unsupported file already left out. */
export const TEST_GALLERY: GalleryPhotoDto[] = [
  {
    src: `${MEDIA_BASE_URL}/gallery/e2e-newer-print.webp`,
    alt: 'E2e newer print',
    uploadedAt: '2026-10-03T10:00:00+00:00',
  },
  {
    src: `${MEDIA_BASE_URL}/gallery/e2e-older_print.webp`,
    alt: 'E2e older print',
    uploadedAt: '2026-10-01T10:00:00+00:00',
  },
];

const LONG_TITLE: string = 'E2E special 💈 with a title that runs well past sixty characters on purpose';

/**
 * What `GET /api/announcements` returns for two made-up announcements already showing today (the API filters by the
 * shop's clock): one with every field and a title past the 60-character portal limit, and a plain-text one. The file
 * order is oldest first, so the page has to sort them.
 */
export const TEST_ANNOUNCEMENTS: AnnouncementDto[] = [
  {
    title: LONG_TITLE,
    bodyHtml: '<p>E2E body with <a href="/#visit">a link to this site</a>.</p><ul><li>E2E item</li></ul>',
    startDate: '2026-10-01',
    endDate: '2099-12-31',
    image: {
      src: `${MEDIA_BASE_URL}/announcements/e2e%20promo.webp`,
      alt: 'E2E promo photo',
      position: AnnouncementImagePosition.Left,
    },
    buttons: [
      {
        label: 'E2E book',
        url: '/book',
        variant: ButtonVariant.Primary,
      },
      {
        label: 'E2E elsewhere',
        url: 'https://example.test/',
        variant: ButtonVariant.Outlined,
      },
    ],
  },
  {
    title: 'E2E plain post',
    bodyHtml: 'E2E plain text',
    startDate: '2026-10-20',
    endDate: '2099-12-31',
    image: null,
    buttons: [],
  },
];

export const ACTIVE_ANNOUNCEMENT_TITLES: string[] = TEST_ANNOUNCEMENTS
  .map((announcement: AnnouncementDto): string => announcement.title);

export function isGalleryRequest(url: URL): boolean {
  return url.href === GALLERY_URL;
}

export async function fulfillGallery(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_GALLERY });
}

export function isAnnouncementsRequest(url: URL): boolean {
  return url.href === ANNOUNCEMENTS_URL;
}

export async function fulfillAnnouncements(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_ANNOUNCEMENTS });
}

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
