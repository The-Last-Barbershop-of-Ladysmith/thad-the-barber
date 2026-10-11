import variantWidths from '../../../../../media/variant-widths.json';
import { environment } from '../../../environments/environment';

export function mediaUrl(
  folder: string,
  key: string,
  size: string,
): string {
  return `${environment.mediaBaseUrl}/${folder}/${key}-${size}.webp`;
}

/**
 * A `srcset` with each variant's real width (`tools/media` writes the sizes in `media/variant-widths.json`). A variant
 * is never wider than its original, so sizes past `originalWidth` are the same file and are left out.
 */
export function mediaSrcset(
  folder: string,
  key: string,
  originalWidth: number,
): string {
  const candidates: string[] = [];
  for (const [size, width] of Object.entries(variantWidths)) {
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
