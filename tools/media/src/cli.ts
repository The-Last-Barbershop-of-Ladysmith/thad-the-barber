import {
  copyFile,
  mkdir,
  readdir,
  rm,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { GalleryContent } from '../../../thad-the-barber-ui/src/app/features/home/models/home.models.ts';
import { checkContent, type CheckedContent } from './content-check.ts';
import { checkGallery } from './gallery-check.ts';
import { findOriginals, type Originals } from './originals.ts';
import { writeVariants } from './variants.ts';

const repoRoot: string = resolve(import.meta.dirname, '../../..');
const mediaDir: string = join(repoRoot, 'media');
const contentDir: string = join(repoRoot, 'content');

interface CheckedMedia {
  originalsByFolder: Map<string, Originals>;
  contentFiles: string[];
}

async function check(): Promise<CheckedMedia> {
  const folders: string[] = (await readdir(mediaDir, { withFileTypes: true }))
    .filter((entry: { isDirectory: () => boolean; }): boolean => entry.isDirectory())
    .map((entry: { name: string; }): string => entry.name)
    .sort();
  const originalsByFolder: Map<string, Originals> = new Map();
  for (const folder of folders) {
    originalsByFolder.set(folder, await findOriginals(join(mediaDir, folder)));
  }
  const content: CheckedContent = await checkContent(contentDir);
  const errors: string[] = [...originalsByFolder.values()].flatMap((originals: Originals): string[] => originals.errors);
  errors.push(...content.errors);
  const gallery: unknown = content.valid.get('gallery.json');
  if (gallery) {
    errors.push(...await checkGallery(gallery as GalleryContent, originalsByFolder.get('gallery')?.files ?? new Map()));
  }
  if (errors.length > 0) {
    throw new Error(`Media check failed:\n${errors.join('\n')}`);
  }
  return { originalsByFolder, contentFiles: [...content.valid.keys()] };
}

/**
 * Empties `outDir`, then writes `<outDir>/media/<folder>/<key>-<size>.webp` for every original and copies the content
 * files to `<outDir>/content/`.
 */
async function build(outDir: string): Promise<void> {
  const { originalsByFolder, contentFiles }: CheckedMedia = await check();
  await rm(outDir, { recursive: true, force: true });
  for (const [folder, originals] of originalsByFolder) {
    for (const [key, source] of originals.files) {
      await writeVariants(source, join(outDir, 'media', folder), key);
    }
    process.stdout.write(`${folder}: ${originals.files.size} images\n`);
  }
  await mkdir(join(outDir, 'content'), { recursive: true });
  for (const name of contentFiles) {
    await copyFile(join(contentDir, name), join(outDir, 'content', name));
  }
  process.stdout.write(`content: ${contentFiles.join(', ')}\n`);
}

const [command, outDir]: (string | undefined)[] = process.argv.slice(2);
try {
  if (command === 'check') {
    await check();
    process.stdout.write('Media and content are valid\n');
  } else if (command === 'build' && outDir) {
    await build(resolve(outDir));
  } else {
    throw new Error('Usage: node src/cli.ts check | build <outDir>');
  }
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
