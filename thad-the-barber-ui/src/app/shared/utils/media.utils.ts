import { environment } from '../../../environments/environment';

/** The variant widths `tools/media` writes (`<key>-<size>.webp`), smallest first. */
export const MEDIA_SIZES: readonly (readonly [string, number])[] = [
  ['sm', 480],
  ['md', 960],
  ['lg', 1600],
];

export function mediaUrl(
  folder: string,
  key: string,
  size: string,
): string {
  return `${environment.mediaBaseUrl}/${folder}/${key}-${size}.webp`;
}

/**
 * A `srcset` with each variant's real width. A variant is never wider than its original, so sizes past
 * `originalWidth` are the same file and are left out.
 */
export function mediaSrcset(
  folder: string,
  key: string,
  originalWidth: number,
): string {
  const candidates: string[] = [];
  for (const [size, width] of MEDIA_SIZES) {
    candidates.push(`${mediaUrl(
      folder,
      key,
      size,
    )} ${Math.min(width, originalWidth)}w`);
    if (width >= originalWidth) {
      break;
    }
  }
  return candidates.join(', ');
}
