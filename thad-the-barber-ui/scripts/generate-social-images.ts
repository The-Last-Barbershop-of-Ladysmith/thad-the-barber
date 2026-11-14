import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Renders the Open Graph and Twitter share images into `public/social/` from the logo, on the espresso page color
 * with a copper glow and a "Book online" button. The output is committed; run `npm run social:images` after the
 * logo or brand colors change, and bump the `-v1` in `src/app/core/services/seo.service.ts` so crawlers refetch.
 */
interface SocialImage {
  fileName: string;
  width: number;
  height: number;
}

const IMAGES: SocialImage[] = [
  { fileName: 'og-v1.jpg', width: 1200, height: 630 },
  { fileName: 'twitter-v1.jpg', width: 1200, height: 600 },
];

const ESPRESSO_950: string = '#0c0806';
const COPPER_500: string = '#e8904a';
const BUTTON_LABEL: string = 'Book online';
const LOGO_WIDTH_SHARE: number = 0.58;
const JPEG_QUALITY: number = 82;

const outDir: string = join(import.meta.dirname, '..', 'public', 'social');
const logoPath: string = join(import.meta.dirname, '..', 'public', 'assets', 'logo.png');

function toBackgroundSvg({ width, height }: SocialImage): Buffer {
  const buttonWidth: number = 360;
  const buttonHeight: number = 84;
  const buttonX: number = (width - buttonWidth) / 2;
  const buttonY: number = height - buttonHeight - 64;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="60%">
      <stop offset="0" stop-color="${COPPER_500}" stop-opacity="0.22" />
      <stop offset="1" stop-color="${ESPRESSO_950}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${ESPRESSO_950}" />
  <rect width="${width}" height="${height}" fill="url(#glow)" />
  <rect x="${buttonX}" y="${buttonY}" width="${buttonWidth}" height="${buttonHeight}" rx="42" fill="${COPPER_500}" />
  <text x="${width / 2}" y="${buttonY + 55}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="38" font-weight="700" letter-spacing="1" fill="${ESPRESSO_950}">${BUTTON_LABEL}</text>
</svg>`);
}

async function render(image: SocialImage): Promise<void> {
  const logo: Buffer = await sharp(logoPath)
    .resize({ width: Math.round(image.width * LOGO_WIDTH_SHARE) })
    .toBuffer();
  const logoHeight: number = (await sharp(logo).metadata()).height;
  await sharp(toBackgroundSvg(image))
    .composite([
      {
        input: logo,
        left: Math.round((image.width - Math.round(image.width * LOGO_WIDTH_SHARE)) / 2),
        top: Math.round((image.height - logoHeight) / 2) - 50,
      },
    ])
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(join(outDir, image.fileName));
}

mkdirSync(outDir, { recursive: true });
await Promise.all(IMAGES.map(render));
process.stdout.write(`Wrote ${IMAGES.map((image: SocialImage): string => image.fileName).join(' and ')} to ${outDir}\n`);
