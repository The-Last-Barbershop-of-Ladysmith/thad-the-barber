import assert from 'node:assert/strict';
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from 'node:test';
import { checkContent, type CheckedContent } from '../src/content-check.ts';

const gallerySchema: string = resolve(import.meta.dirname, '../../../content/schemas/gallery.schema.json');

describe('checkContent', (): void => {
  let dir: string;

  beforeEach(async (): Promise<void> => {
    dir = await mkdtemp(join(tmpdir(), 'ttb-content-'));
    await mkdir(join(dir, 'schemas'));
    await copyFile(gallerySchema, join(dir, 'schemas', 'gallery.schema.json'));
  });

  afterEach(async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
  });

  async function checkGalleryPhoto(overrides: Record<string, unknown>): Promise<CheckedContent> {
    const photo: Record<string, unknown> = {
      id: 'lineup-07',
      image: 'lineup-07',
      alt: 'Sharp line-up with a low skin fade',
      width: 300,
      height: 400,
      ...overrides,
    };
    await writeFile(join(dir, 'gallery.json'), JSON.stringify({ photos: [photo] }));
    return checkContent(dir);
  }

  it('passes a valid file and returns it parsed', async (): Promise<void> => {
    const content: CheckedContent = await checkGalleryPhoto({});

    assert.deepEqual(content.errors, []);
    assert.deepEqual([...content.valid.keys()], ['gallery.json']);
  });

  for (const [name, overrides] of [
    ['missing alt', { alt: undefined }],
    ['blank alt', { alt: '   ' }],
    ['an image key with spaces', { image: 'IMG 0042' }],
    ['a zero width', { width: 0 }],
    ['an unknown field', { caption: 'extra' }],
  ] as const) {
    it(`fails the gallery schema with ${name}`, async (): Promise<void> => {
      const content: CheckedContent = await checkGalleryPhoto(overrides);

      assert.ok(content.errors.length > 0);
      assert.match(content.errors[0] ?? '', /^gallery\.json\/photos\/0/);
      assert.equal(content.valid.size, 0);
    });
  }

  it('fails a content file without a schema', async (): Promise<void> => {
    await writeFile(join(dir, 'specials.json'), '{}');

    const content: CheckedContent = await checkContent(dir);

    assert.equal(content.errors.length, 1);
    assert.match(content.errors[0] ?? '', /^specials\.json: no schema at /);
  });
});
