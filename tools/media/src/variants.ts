import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import variantWidths from '../../../media/variant-widths.json' with { type: 'json' };

export interface ImageSize {
  width: number;
  height: number;
}

/** The original's size as the site shows it: EXIF-rotated, so a portrait phone photo reads as portrait. Reads only the header. */
export async function readSize(source: string): Promise<ImageSize> {
  return (await sharp(source).metadata()).autoOrient;
}

/**
 * Writes `<key>-<size>.webp` for every size in `media/variant-widths.json` into `outDir`, never wider than the original.
 * sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it, so `rotate()` first bakes the EXIF orientation
 * into the pixels. The original is decoded once and cloned per size.
 */
export async function writeVariants(source: string, outDir: string, key: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const original: Sharp = sharp(source).rotate();
  await Promise.all(Object.entries(variantWidths).map(
    ([size, width]: [string, number]): Promise<unknown> => original
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(join(outDir, `${key}-${size}.webp`)),
  ));
}
