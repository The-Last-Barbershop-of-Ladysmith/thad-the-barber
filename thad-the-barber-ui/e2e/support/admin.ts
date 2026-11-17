import { Page, Route } from '@playwright/test';
import { AdminSessionDto } from '../../src/app/features/admin/dtos/admin-session.dto';
import { AdminGalleryPhotoDto } from '../../src/app/features/admin-gallery/dtos/admin-gallery-photo.dto';
import { AdminShopInfoDto } from '../../src/app/features/admin-shop/dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../../src/app/features/admin-shop/dtos/shop-info-save-request.dto';
import { AdminAnnouncementDto } from '../../src/app/features/admin-announcements/dtos/admin-announcement.dto';
import {
  AnnouncementInputDto,
  AnnouncementsSaveRequestDto,
} from '../../src/app/features/admin-announcements/dtos/announcements-save-request.dto';
import {
  AdminAnnouncementStatus,
} from '../../src/app/features/admin-announcements/models/admin-announcement-status.model';
import { servedEnvironment } from './served-environment';

export const ADMIN_CONFIG_URL: string = `${servedEnvironment.apiBaseUrl}/admin/config`;
export const ADMIN_SESSION_URL: string = `${servedEnvironment.apiBaseUrl}/admin/session`;

export const ADMIN_EMAIL: string = 'owner@example.com';

/**
 * Stands in for Google Identity Services, so tests never call Google: `renderButton` draws a button that, when
 * clicked, hands the page an ID token like the real one does after an account is picked.
 */
const GOOGLE_SIGN_IN_STUB: string = `window.google = { accounts: { id: {
  initialize: (config) => { window.__googleConfig = config; },
  renderButton: (container) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'google-stub-button';
    button.textContent = 'Sign in with Google';
    button.addEventListener('click', () => window.__googleConfig.callback({ credential: 'e2e-google-id-token' }));
    container.append(button);
  },
} } };`;

export function isGoogleScript(url: URL): boolean {
  return url.origin === 'https://accounts.google.com' && url.pathname === '/gsi/client';
}

export async function fulfillGoogleScript(route: Route): Promise<void> {
  await route.fulfill({ contentType: 'text/javascript', body: GOOGLE_SIGN_IN_STUB });
}

export function adminSession(): AdminSessionDto {
  return {
    token: 'e2e-admin-jwt',
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    email: ADMIN_EMAIL,
  };
}

/** The API's ProblemDetails for a failed admin call. */
export async function fulfillProblem(
  route: Route,
  status: number,
  code: string,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/problem+json',
    json: {
      type: 'about:blank',
      title: code,
      status,
      code,
    },
  });
}

/** Mocks `GET /api/admin/config`, then the Google script; sign-in itself is mocked by each test. */
export async function mockGoogleSignIn(page: Page): Promise<void> {
  await page.route(isGoogleScript, fulfillGoogleScript);
  await page.route(
    (url: URL): boolean => url.href === ADMIN_CONFIG_URL,
    async (route: Route): Promise<void> => {
      await route.fulfill({ json: { googleClientId: 'e2e-client-id.apps.example.com' } });
    },
  );
}

export const ADMIN_ANNOUNCEMENTS_URL: string = `${servedEnvironment.apiBaseUrl}/admin/announcements`;

/** The announcements the mocked admin API holds, and every list the page saved (`PUT`). */
export interface MockedAnnouncements {
  items: AdminAnnouncementDto[];
  saves: AnnouncementInputDto[][];
}

/** Stands in for `GET` and `PUT /api/admin/announcements`: a save replaces the list, and every item then shows. */
export async function mockAdminAnnouncements(page: Page, items: AdminAnnouncementDto[]): Promise<MockedAnnouncements> {
  const mocked: MockedAnnouncements = {
    items,
    saves: [],
  };
  await page.route(
    (url: URL): boolean => url.href === ADMIN_ANNOUNCEMENTS_URL,
    async (route: Route): Promise<void> => {
      if (route.request().method() === 'PUT') {
        const saved: AnnouncementInputDto[] = (route.request().postDataJSON() as AnnouncementsSaveRequestDto).items;
        mocked.saves.push(saved);
        mocked.items = saved.map((input: AnnouncementInputDto): AdminAnnouncementDto => ({
          ...input,
          image: input.image === null
            ? null
            : {
              ...input.image,
              src: MOCK_IMAGE_SRC,
            },
          status: AdminAnnouncementStatus.Showing,
        }));
      }
      await route.fulfill({ json: mocked.items });
    },
  );
  return mocked;
}

export const ADMIN_SHOP_URL: string = `${servedEnvironment.apiBaseUrl}/admin/shop`;

/** The shop info the mocked admin API holds, and every body the page saved (`PUT`). */
export interface MockedShopInfo {
  info: AdminShopInfoDto;
  saves: ShopInfoSaveRequestDto[];
}

/** Stands in for `GET` and `PUT /api/admin/shop`: a save is read back as saved, next to Square's description. */
export async function mockAdminShop(page: Page, info: AdminShopInfoDto): Promise<MockedShopInfo> {
  const mocked: MockedShopInfo = {
    info,
    saves: [],
  };
  await page.route(
    (url: URL): boolean => url.href === ADMIN_SHOP_URL,
    async (route: Route): Promise<void> => {
      if (route.request().method() === 'PUT') {
        const saved: ShopInfoSaveRequestDto = route.request().postDataJSON() as ShopInfoSaveRequestDto;
        mocked.saves.push(saved);
        mocked.info = {
          ...saved,
          squareNotice: info.squareNotice,
        };
      }
      await route.fulfill({ json: mocked.info });
    },
  );
  return mocked;
}

/** A one pixel image inline: the site's CSP only lets images load from its own sources and the media container. */
export const MOCK_IMAGE_SRC: string = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

export const ADMIN_GALLERY_URL: string = `${servedEnvironment.apiBaseUrl}/admin/gallery`;
export const ADMIN_ANNOUNCEMENT_IMAGES_URL: string = `${servedEnvironment.apiBaseUrl}/admin/announcements/images`;

/** The photos the mocked gallery holds, and each description sent with an upload and each file name deleted. */
export interface MockedGallery {
  photos: AdminGalleryPhotoDto[];
  uploads: string[];
  deletes: string[];
}

/**
 * Stands in for the admin gallery calls: `GET` lists, `POST` stores the photo under its description (as the API does,
 * lower case and hyphenated) at the top, `DELETE` removes one.
 */
export async function mockAdminGallery(page: Page, photos: AdminGalleryPhotoDto[]): Promise<MockedGallery> {
  const mocked: MockedGallery = {
    photos,
    uploads: [],
    deletes: [],
  };
  await page.route(
    (url: URL): boolean => url.href === ADMIN_GALLERY_URL || url.href.startsWith(`${ADMIN_GALLERY_URL}/`),
    async (route: Route): Promise<void> => {
      const method: string = route.request().method();
      if (method === 'POST') {
        const altText: string = /name="altText"\r\n\r\n([^\r]*)/.exec(route.request().postData() ?? '')?.[1] ?? '';
        const fileName: string = `${altText.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '')}.jpg`;
        const photo: AdminGalleryPhotoDto = {
          fileName,
          src: MOCK_IMAGE_SRC,
          altText,
          uploadedAt: new Date().toISOString(),
        };
        mocked.uploads.push(altText);
        mocked.photos = [photo, ...mocked.photos];
        await route.fulfill({ status: 201, json: photo });
        return;
      }
      if (method === 'DELETE') {
        const fileName: string = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1) ?? '');
        mocked.deletes.push(fileName);
        mocked.photos = mocked.photos.filter((photo: AdminGalleryPhotoDto): boolean => photo.fileName !== fileName);
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({ json: mocked.photos });
    },
  );
  return mocked;
}

/** Stands in for `POST /api/admin/announcements/images`: every photo is stored under a fixed name. */
export async function mockAnnouncementImageUpload(page: Page): Promise<void> {
  await page.route(
    (url: URL): boolean => url.href === ADMIN_ANNOUNCEMENT_IMAGES_URL,
    async (route: Route): Promise<void> => {
      await route.fulfill({
        status: 201,
        json: {
          fileName: 'sale-sign-1a2b3c4d.jpg',
          src: MOCK_IMAGE_SRC,
        },
      });
    },
  );
}
