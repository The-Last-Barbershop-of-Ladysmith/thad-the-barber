import { Route } from '@playwright/test';
import { AnnouncementDto } from '../../src/app/features/announcements/dtos/announcement.dto';
import {
  AnnouncementImagePosition,
} from '../../src/app/features/announcements/models/announcement-image-position.model';
import { ButtonVariant } from '../../src/app/shared/models/button.models';
import { MEDIA_BASE_URL } from './media';
import { servedEnvironment } from './served-environment';

export const ANNOUNCEMENTS_URL: string = `${servedEnvironment.apiBaseUrl}/announcements`;

const LONG_TITLE: string = 'E2E special 💈 with a title that runs well past sixty characters on purpose';

/** Oldest first, so the page has to sort them. */
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

export const TEST_ANNOUNCEMENT_TITLES: string[] = TEST_ANNOUNCEMENTS
  .map((announcement: AnnouncementDto): string => announcement.title);

export function isAnnouncementsRequest(url: URL): boolean {
  return url.href === ANNOUNCEMENTS_URL;
}

export async function fulfillAnnouncements(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_ANNOUNCEMENTS });
}
