import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Renders the icon set from `scripts/brand/mark.svg` (the TB monogram with a straight razor as the T's crossbar)
 * on the espresso page color. The output in `public/` is committed. Rerun it after the mark or brand colors
 * change: `npm run icons`.
 */
interface RasterIcon {
  fileName: string;
  size: number;
  markFraction: number;
}

const ESPRESSO_950: string = '#0c0806';
const FULL_MARK_FRACTION: number = 1;
const MASKABLE_SAFE_ZONE_FRACTION: number = 0.7;
const ICO_SIZES: number[] = [
  16,
  32,
  48,
];
const ICO_HEADER_BYTES: number = 6;
const ICO_ENTRY_BYTES: number = 16;

const RASTER_ICONS: RasterIcon[] = [
  {
    fileName: 'apple-touch-icon.png',
    size: 180,
    markFraction: FULL_MARK_FRACTION,
  },
  {
    fileName: 'icon-192.png',
    size: 192,
    markFraction: FULL_MARK_FRACTION,
  },
  {
    fileName: 'icon-512.png',
    size: 512,
    markFraction: FULL_MARK_FRACTION,
  },
  {
    fileName: 'icon-maskable-512.png',
    size: 512,
    markFraction: MASKABLE_SAFE_ZONE_FRACTION,
  },
];

const brandDir: string = join(
  import.meta.dirname,
  'brand',
);
const publicDir: string = join(
  import.meta.dirname,
  '..',
  'public',
);
const markShapes: string = readFileSync(
  join(
    brandDir,
    'mark.svg',
  ),
  'utf8',
).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

function toIconSvg(markFraction: number): string {
  const canvas: number = 512;
  const offset: number = (canvas - canvas * markFraction) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="${canvas}" height="${canvas}" fill="${ESPRESSO_950}"/>
  <g fill="#e8904a" transform="translate(${offset} ${offset}) scale(${markFraction})">${markShapes}</g>
</svg>
`;
}

function renderPng(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(
      size,
      size,
    )
    .png()
    .toBuffer();
}

/** An ICO file can hold PNG images as they are, so sharp (which can't write ICO) is enough. */
function toIco(pngs: Buffer[], sizes: number[]): Buffer {
  const header: Buffer = Buffer.alloc(ICO_HEADER_BYTES);
  header.writeUInt16LE(
    1,
    2,
  );
  header.writeUInt16LE(
    pngs.length,
    4,
  );
  let imageOffset: number = ICO_HEADER_BYTES + ICO_ENTRY_BYTES * pngs.length;
  const entries: Buffer[] = pngs.map((png: Buffer, index: number): Buffer => {
    const entry: Buffer = Buffer.alloc(ICO_ENTRY_BYTES);
    entry.writeUInt8(
      sizes[index] ?? 0,
      0,
    );
    entry.writeUInt8(
      sizes[index] ?? 0,
      1,
    );
    entry.writeUInt16LE(
      1,
      4,
    );
    entry.writeUInt16LE(
      32,
      6,
    );
    entry.writeUInt32LE(
      png.length,
      8,
    );
    entry.writeUInt32LE(
      imageOffset,
      12,
    );
    imageOffset += png.length;
    return entry;
  });
  return Buffer.concat([
    header,
    ...entries,
    ...pngs,
  ]);
}

writeFileSync(
  join(
    publicDir,
    'favicon.svg',
  ),
  toIconSvg(FULL_MARK_FRACTION),
);
await Promise.all(RASTER_ICONS.map(async (icon: RasterIcon): Promise<void> => {
  writeFileSync(
    join(
      publicDir,
      icon.fileName,
    ),
    await renderPng(
      toIconSvg(icon.markFraction),
      icon.size,
    ),
  );
}));
const icoPngs: Buffer[] = await Promise.all(ICO_SIZES.map((size: number): Promise<Buffer> => renderPng(
  toIconSvg(FULL_MARK_FRACTION),
  size,
)));
writeFileSync(
  join(
    publicDir,
    'favicon.ico',
  ),
  toIco(
    icoPngs,
    ICO_SIZES,
  ),
);
process.stdout.write(`Wrote favicon.svg, favicon.ico and ${RASTER_ICONS.map((icon: RasterIcon): string => icon.fileName).join(', ')} to ${publicDir}\n`);
