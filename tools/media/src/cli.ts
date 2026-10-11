import {
  copyFile,
  mkdir,
  readFile,
  readdir,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { checkGallery } from './gallery-check.ts';
import { findOriginals, type Originals } from './originals.ts';
import { writeVariants } from './variants.ts';

const repoRoot: string = resolve(import.meta.dirname, '../../..');
const mediaDir: string = join(repoRoot, 'media');
const contentDir: string = join(repoRoot, 'content');

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function mediaFolders(): Promise<string[]> {
  return (await readdir(mediaDir, { withFileTypes: true }))
    .filter((entry: { isDirectory: () => boolean; }): boolean => entry.isDirectory())
    .map((entry: { name: string; }): string => entry.name)
    .sort();
}

async function check(): Promise<Map<string, Originals>> {
  const originalsByFolder: Map<string, Originals> = new Map();
  for (const folder of await mediaFolders()) {
    originalsByFolder.set(folder, await findOriginals(join(mediaDir, folder)));
  }
  const errors: string[] = [...originalsByFolder.values()].flatMap((originals: Originals): string[] => originals.errors);
  errors.push(...await checkGallery(
    await readJson(join(contentDir, 'gallery.json')),
    await readJson(join(contentDir, 'schemas', 'gallery.schema.json')) as object,
    originalsByFolder.get('gallery')?.files ?? new Map(),
  ));
  if (errors.length > 0) {
    throw new Error(`Media check failed:\n${errors.join('\n')}`);
  }
  return originalsByFolder;
}

/** Writes `<outDir>/<folder>/<key>-<size>.webp` for every original and copies the content files to `<outDir>/content/`. */
async function build(outDir: string): Promise<void> {
  for (const [folder, originals] of await check()) {
    for (const [key, source] of originals.files) {
      await writeVariants(source, join(outDir, folder), key);
    }
    process.stdout.write(`${folder}: ${originals.files.size} images\n`);
  }
  await mkdir(join(outDir, 'content'), { recursive: true });
  const contentFiles: string[] = (await readdir(contentDir)).filter((name: string): boolean => name.endsWith('.json'));
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
