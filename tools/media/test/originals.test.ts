import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from 'node:test';
import { findOriginals, type Originals } from '../src/originals.ts';

describe('findOriginals', (): void => {
  let dir: string;

  beforeEach(async (): Promise<void> => {
    dir = await mkdtemp(join(tmpdir(), 'ttb-originals-'));
  });

  afterEach(async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
  });

  it('keys images by file name without extension and skips other files', async (): Promise<void> => {
    await writeFile(join(dir, 'fade-02.JPG'), '');
    await writeFile(join(dir, 'fade-01.webp'), '');
    await writeFile(join(dir, 'notes.txt'), '');

    const originals: Originals = await findOriginals(dir);

    assert.deepEqual([...originals.files.keys()], ['fade-01', 'fade-02']);
    assert.equal(originals.files.get('fade-02'), join(dir, 'fade-02.JPG'));
    assert.deepEqual(originals.errors, []);
  });

  it('reports two files with the same key', async (): Promise<void> => {
    await writeFile(join(dir, 'taper.jpg'), '');
    await writeFile(join(dir, 'taper.png'), '');

    const originals: Originals = await findOriginals(dir);

    assert.equal(originals.errors.length, 1);
    assert.match(originals.errors[0] ?? '', /taper\.png: same key as .*taper\.jpg/);
  });
});
