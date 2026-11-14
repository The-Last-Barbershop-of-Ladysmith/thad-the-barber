import { APIResponse, Locator, Page } from '@playwright/test';
import { SHOP_FALLBACK } from '../../src/app/core/config/shop-info';
import { primitive } from '../../src/app/theme/tokens/primitive';
import { expect, test } from '../support/fixtures';

interface IconLink {
  selector: string;
  contentType: RegExp;
}

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}

interface Manifest {
  name: string;
  short_name: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
}

interface PrimitiveTokens {
  espresso: Record<string, string>;
}

const PAGE_BACKGROUND: string | undefined = (primitive as PrimitiveTokens).espresso['950'];
const ICON_LINKS: IconLink[] = [
  { selector: 'link[rel="icon"][type="image/svg+xml"]', contentType: /^image\/svg\+xml/ },
  { selector: 'link[rel="icon"][type="image/x-icon"]', contentType: /^image\/(x-icon|vnd\.microsoft\.icon)/ },
  { selector: 'link[rel="apple-touch-icon"]', contentType: /^image\/png/ },
  { selector: 'link[rel="manifest"]', contentType: /^application\/manifest\+json/ },
];
const MIN_SEARCH_ICON_SIZE: number = 48;
const PNG_WIDTH_OFFSET: number = 16;
const PNG_HEIGHT_OFFSET: number = 20;
const ICO_COUNT_OFFSET: number = 4;
const ICO_HEADER_BYTES: number = 6;
const ICO_ENTRY_BYTES: number = 16;

async function fetchLinked(page: Page, link: Locator): Promise<APIResponse> {
  const href: string = (await link.getAttribute('href')) ?? '';
  return page.request.get(new URL(
    href,
    page.url(),
  ).pathname);
}

test.describe(
  'icon set and manifest',
  (): void => {
    test.beforeEach(async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
      test.skip(isMobile, 'The head and the files do not depend on the viewport; the desktop projects cover both engines.');

      await page.goto('/');
    });

    for (const link of ICON_LINKS) {
      test(
        `${link.selector} answers 200 with its own type`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const response: APIResponse = await fetchLinked(
            page,
            page.locator(link.selector),
          );

          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toMatch(link.contentType);
        },
      );
    }

    test(
      'favicon.ico holds an image of at least 48 pixels, for Google Search',
      async ({ page }: { page: Page; }): Promise<void> => {
        const ico: Buffer = await (await fetchLinked(
          page,
          page.locator('link[rel="icon"][type="image/x-icon"]'),
        )).body();
        const sizes: number[] = Array.from(
          { length: ico.readUInt16LE(ICO_COUNT_OFFSET) },
          (_: unknown, index: number): number => ico.readUInt8(ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES),
        );

        expect(sizes).toContain(16);
        expect(sizes).toContain(32);
        expect(Math.max(...sizes)).toBeGreaterThanOrEqual(MIN_SEARCH_ICON_SIZE);
      },
    );

    test(
      'the manifest names the shop, uses the page background token and lists icons of the size they claim',
      async ({ page }: { page: Page; }): Promise<void> => {
        const manifest: Manifest = await (await fetchLinked(
          page,
          page.locator('link[rel="manifest"]'),
        )).json() as Manifest;

        expect(manifest.name).toBe(SHOP_FALLBACK.name);
        expect(manifest.short_name).toBe(SHOP_FALLBACK.name);
        expect(manifest.theme_color).toBe(PAGE_BACKGROUND);
        expect(manifest.background_color).toBe(PAGE_BACKGROUND);
        expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
        for (const icon of manifest.icons) {
          const response: APIResponse = await page.request.get(icon.src);
          const png: Buffer = await response.body();
          const [width, height]: string[] = icon.sizes.split('x');

          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toBe(icon.type);
          expect(png.readUInt32BE(PNG_WIDTH_OFFSET)).toBe(Number(width));
          expect(png.readUInt32BE(PNG_HEIGHT_OFFSET)).toBe(Number(height));
        }
      },
    );

    test(
      'the apple touch icon is 180 pixels square',
      async ({ page }: { page: Page; }): Promise<void> => {
        const png: Buffer = await (await fetchLinked(
          page,
          page.locator('link[rel="apple-touch-icon"]'),
        )).body();

        expect(png.readUInt32BE(PNG_WIDTH_OFFSET)).toBe(180);
        expect(png.readUInt32BE(PNG_HEIGHT_OFFSET)).toBe(180);
      },
    );

    test(
      'the theme color is the page background token',
      async ({ page }: { page: Page; }): Promise<void> => {
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
          'content',
          PAGE_BACKGROUND ?? '',
        );
      },
    );
  },
);
