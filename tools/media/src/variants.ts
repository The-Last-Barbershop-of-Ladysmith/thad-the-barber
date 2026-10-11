import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type OutputInfo } from 'sharp';

/** The widths the site's srcset asks for. A variant is never wider than its original. */
export const VARIANT_WIDTHS: Readonly<Record<string, number>> = {
  sm: 480,
  md: 960,
  lg: 1600,
};

export interface ImageSize {
  width: number;
  height: number;
}

/** The original's size as the site shows it: EXIF-rotated, so a portrait phone photo reads as portrait. */
export async function readSize(source: string): Promise<ImageSize> {
  const { info }: { info: OutputInfo; } = await sharp(source).rotate().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height };
}

/**
 * Writes `<key>-<size>.webp` for every size into `outDir`. sharp drops all metadata (EXIF, GPS, ICC) unless asked
 * to keep it, so `rotate()` first bakes the EXIF orientation into the pixels.
 */
export async function writeVariants(source: string, outDir: string, key: string): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const written: string[] = [];
  for (const [size, width] of Object.entries(VARIANT_WIDTHS)) {
    const file: string = join(outDir, `${key}-${size}.webp`);
    await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(file);
    written.push(file);
  }
  return written;
}
