import assert from 'node:assert/strict';
import {
  mkdtemp,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  after,
  before,
  describe,
  it,
} from 'node:test';
import sharp, { type Metadata } from 'sharp';
import variantWidths from '../../../media/variant-widths.json' with { type: 'json' };
import { readSize, writeVariants } from '../src/variants.ts';
import { writeTestJpeg } from './images.ts';

describe('variants', (): void => {
  let dir: string;

  before(async (): Promise<void> => {
    dir = await mkdtemp(join(tmpdir(), 'ttb-media-'));
  });

  after(async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes sm, md and lg WebP files named <key>-<size>.webp', async (): Promise<void> => {
    const source: string = join(dir, 'wide.jpg');
    await writeTestJpeg(source, { width: 4000, height: 2000 });

    await writeVariants(source, join(dir, 'wide-out'), 'wide-01');

    assert.deepEqual((await readdir(join(dir, 'wide-out'))).sort(), [
      'wide-01-lg.webp',
      'wide-01-md.webp',
      'wide-01-sm.webp',
    ]);
    const widths: (number | undefined)[] = [];
    for (const size of ['sm', 'md', 'lg']) {
      const metadata: Metadata = await sharp(join(dir, 'wide-out', `wide-01-${size}.webp`)).metadata();
      assert.equal(metadata.format, 'webp');
      widths.push(metadata.width);
    }
    assert.deepEqual(widths, [variantWidths.sm, variantWidths.md, variantWidths.lg]);
  });

  it('never makes a variant wider than its original', async (): Promise<void> => {
    const source: string = join(dir, 'small.jpg');
    await writeTestJpeg(source, { width: 700, height: 900 });

    await writeVariants(source, join(dir, 'small-out'), 'small');

    const md: Metadata = await sharp(join(dir, 'small-out', 'small-md.webp')).metadata();
    const lg: Metadata = await sharp(join(dir, 'small-out', 'small-lg.webp')).metadata();
    assert.deepEqual([md.width, md.height], [700, 900]);
    assert.deepEqual([lg.width, lg.height], [700, 900]);
  });

  it('strips EXIF and GPS data, keeping the photo upright', async (): Promise<void> => {
    const source: string = join(dir, 'rotated.jpg');
    await writeTestJpeg(source, { width: 1200, height: 600, orientation: 6 });
    assert.ok((await sharp(source).metadata()).exif, 'the test original carries EXIF');

    await writeVariants(source, join(dir, 'rotated-out'), 'rotated');

    const metadata: Metadata = await sharp(join(dir, 'rotated-out', 'rotated-sm.webp')).metadata();
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
    assert.ok(metadata.height > metadata.width, 'the rotation is baked into the pixels');
  });

  it('reads the size the site shows, after EXIF rotation', async (): Promise<void> => {
    const source: string = join(dir, 'portrait.jpg');
    await writeTestJpeg(source, { width: 640, height: 480, orientation: 6 });

    assert.deepEqual(await readSize(source), { width: 480, height: 640 });
  });
});
