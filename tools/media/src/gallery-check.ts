import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import { readSize, type ImageSize } from './variants.ts';

interface GalleryPhoto {
  id: string;
  image: string;
  alt: string;
  width: number;
  height: number;
}

interface Gallery { photos: GalleryPhoto[]; }

/**
 * Checks `gallery.json` against its schema, then each photo against the originals: the image key exists, ids and
 * images are unique, and width/height match the original (the site reserves that space before the image loads).
 */
export async function checkGallery(gallery: unknown, schema: object, originals: Map<string, string>): Promise<string[]> {
  const validate: ReturnType<Ajv2020['compile']> = new Ajv2020({ allErrors: true }).compile(schema);
  if (!validate(gallery)) {
    return (validate.errors ?? []).map(
      (error: ErrorObject): string => `gallery.json${error.instancePath} ${error.message ?? 'is invalid'}`,
    );
  }

  const errors: string[] = [];
  const ids: Set<string> = new Set();
  const images: Set<string> = new Set();
  for (const photo of (gallery as Gallery).photos) {
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
