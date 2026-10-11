import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  after,
  before,
  describe,
  it,
} from 'node:test';
import type { GalleryPhoto } from '../../../thad-the-barber-ui/src/app/features/home/models/home.models.ts';
import { checkGallery } from '../src/gallery-check.ts';
import { writeTestJpeg } from './images.ts';

describe('checkGallery', (): void => {
  let dir: string;
  let originals: Map<string, string>;

  before(async (): Promise<void> => {
    dir = await mkdtemp(join(tmpdir(), 'ttb-gallery-'));
    await writeTestJpeg(join(dir, 'lineup-07.jpg'), { width: 300, height: 400 });
    originals = new Map([['lineup-07', join(dir, 'lineup-07.jpg')]]);
  });

  after(async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
  });

  function photo(overrides: Partial<GalleryPhoto> = {}): GalleryPhoto {
    return {
      id: 'lineup-07',
      image: 'lineup-07',
      alt: 'Sharp line-up with a low skin fade',
      width: 300,
      height: 400,
      ...overrides,
    };
  }

  it('passes photos that match their originals', async (): Promise<void> => {
    assert.deepEqual(await checkGallery({ photos: [photo()] }, originals), []);
  });

  it('passes an empty gallery', async (): Promise<void> => {
    assert.deepEqual(await checkGallery({ photos: [] }, originals), []);
  });

  it('fails an image key with no original', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo({ id: 'ghost', image: 'ghost-99' })] }, originals);

    assert.deepEqual(errors, ['gallery.json: "ghost" points at "ghost-99", which has no original in media/gallery/']);
  });

  it('fails a size that does not match the original', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo({ width: 400, height: 300 })] }, originals);

    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? '', /"lineup-07" is 400×300, but .* is 300×400/);
  });

  it('fails duplicate ids and images', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo(), photo()] }, originals);

    assert.deepEqual(errors, ['gallery.json: duplicate id "lineup-07"', 'gallery.json: "lineup-07" is listed twice']);
  });
});
