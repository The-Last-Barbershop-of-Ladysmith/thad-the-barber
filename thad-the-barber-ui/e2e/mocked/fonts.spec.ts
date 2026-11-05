import { Page, Request } from '@playwright/test';
import { expect, test } from '../support/fixtures';

const DISPLAY_FONT: string = 'Syne Variable';
const BODY_FONT: string = 'Plus Jakarta Sans Variable';
const EXTERNAL_FONT_HOSTS: string[] = ['fonts.googleapis.com', 'fonts.gstatic.com'];

interface FontSample {
  displayFamily: string;
  bodyFamily: string;
  isDisplayLoaded: boolean;
  isBodyLoaded: boolean;
}

const PAGES: string[] = [
  '/',
  '/book',
  '/privacy',
  '/no-such-page',
];

async function sampleFonts(page: Page): Promise<FontSample> {
  return await page.evaluate(async (): Promise<FontSample> => {
    const heading: Element | null = document.querySelector('h1');
    await document.fonts.ready;
    // `fonts.check` is true for a family that doesn't exist, so look for a face the page really downloaded.
    const isLoaded: (family: string) => boolean = (family: string): boolean =>
      Array.from(document.fonts).some((face: FontFace): boolean => face.family.replace(/"/g, '') === family
        && face.status === 'loaded');
    return {
      displayFamily: heading ? getComputedStyle(heading).fontFamily : '',
      bodyFamily: getComputedStyle(document.body).fontFamily,
      isDisplayLoaded: isLoaded('Syne Variable'),
      isBodyLoaded: isLoaded('Plus Jakarta Sans Variable'),
    };
  });
}

for (const path of PAGES) {
  test(
    `${path} sets its headings and text in the self-hosted fonts`,
    async ({ page }: { page: Page; }): Promise<void> => {
      const externalRequests: string[] = [];
      page.on('request', (request: Request): void => {
        if (EXTERNAL_FONT_HOSTS.includes(new URL(request.url()).hostname)) {
          externalRequests.push(request.url());
        }
      });

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const sample: FontSample = await sampleFonts(page);

      expect(sample.displayFamily).toContain(DISPLAY_FONT);
      expect(sample.bodyFamily).toContain(BODY_FONT);
      expect(sample.isDisplayLoaded).toBe(true);
      expect(sample.isBodyLoaded).toBe(true);
      expect(externalRequests).toEqual([]);
    },
  );
}
