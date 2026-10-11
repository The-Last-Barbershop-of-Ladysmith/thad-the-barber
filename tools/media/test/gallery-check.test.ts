import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  after,
  before,
  describe,
  it,
} from 'node:test';
import { checkGallery } from '../src/gallery-check.ts';
import { writeTestJpeg } from './images.ts';

const schemaPath: string = resolve(import.meta.dirname, '../../../content/schemas/gallery.schema.json');

describe('checkGallery', (): void => {
  let dir: string;
  let schema: object;
  let originals: Map<string, string>;

  before(async (): Promise<void> => {
    dir = await mkdtemp(join(tmpdir(), 'ttb-gallery-'));
    schema = JSON.parse(await readFile(schemaPath, 'utf8')) as object;
    await writeTestJpeg(join(dir, 'lineup-07.jpg'), { width: 300, height: 400 });
    originals = new Map([['lineup-07', join(dir, 'lineup-07.jpg')]]);
  });

  after(async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
  });

  function photo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'lineup-07',
      image: 'lineup-07',
      alt: 'Sharp line-up with a low skin fade',
      width: 300,
      height: 400,
      ...overrides,
    };
  }

  it('passes a valid gallery', async (): Promise<void> => {
    assert.deepEqual(await checkGallery({ photos: [photo()] }, schema, originals), []);
  });

  it('passes an empty gallery', async (): Promise<void> => {
    assert.deepEqual(await checkGallery({ photos: [] }, schema, originals), []);
  });

  for (const [name, overrides] of [
    ['missing alt', { alt: undefined }],
    ['blank alt', { alt: '   ' }],
    ['an image key with spaces', { image: 'IMG 0042' }],
    ['a zero width', { width: 0 }],
    ['an unknown field', { caption: 'extra' }],
  ] as const) {
    it(`fails the schema with ${name}`, async (): Promise<void> => {
      const errors: string[] = await checkGallery({ photos: [photo(overrides)] }, schema, originals);

      assert.ok(errors.length > 0);
      assert.match(errors[0] ?? '', /^gallery\.json\/photos\/0/);
    });
  }

  it('fails an image key with no original', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo({ id: 'ghost', image: 'ghost-99' })] }, schema, originals);

    assert.deepEqual(errors, ['gallery.json: "ghost" points at "ghost-99", which has no original in media/gallery/']);
  });

  it('fails a size that does not match the original', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo({ width: 400, height: 300 })] }, schema, originals);

    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? '', /"lineup-07" is 400×300, but .* is 300×400/);
  });

  it('fails duplicate ids and images', async (): Promise<void> => {
    const errors: string[] = await checkGallery({ photos: [photo(), photo()] }, schema, originals);

    assert.deepEqual(errors, ['gallery.json: duplicate id "lineup-07"', 'gallery.json: "lineup-07" is listed twice']);
  });
});
