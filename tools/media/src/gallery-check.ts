import type { GalleryContent } from '../../../thad-the-barber-ui/src/app/features/home/models/home.models.ts';
import { readSize, type ImageSize } from './variants.ts';

/**
 * Checks a schema-valid `gallery.json` against the originals: the image key exists, ids and images are unique, and
 * width/height match the original (the site reserves that space before the image loads).
 */
export async function checkGallery(gallery: GalleryContent, originals: Map<string, string>): Promise<string[]> {
  const errors: string[] = [];
  const ids: Set<string> = new Set();
  const images: Set<string> = new Set();
  for (const photo of gallery.photos) {
    if (ids.has(photo.id)) {
      errors.push(`gallery.json: duplicate id "${photo.id}"`);
    }
    if (images.has(photo.image)) {
      errors.push(`gallery.json: "${photo.image}" is listed twice`);
    }
    ids.add(photo.id);
    images.add(photo.image);

    const source: string | undefined = originals.get(photo.image);
    if (!source) {
      errors.push(`gallery.json: "${photo.id}" points at "${photo.image}", which has no original in media/gallery/`);
      continue;
    }
    const size: ImageSize = await readSize(source);
    if (size.width !== photo.width || size.height !== photo.height) {
      errors.push(`gallery.json: "${photo.id}" is ${photo.width}×${photo.height}, but ${source} is ${size.width}×${size.height}`);
    }
  }
  return errors;
}
