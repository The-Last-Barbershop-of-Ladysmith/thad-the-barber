import { readdir } from 'node:fs/promises';
import {
  extname,
  join,
  parse,
} from 'node:path';

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.avif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
]);

export interface Originals {
  /** Key (file name without extension) → path. */
  files: Map<string, string>;
  errors: string[];
}

/** The originals in one `media/` folder. Two files with the same key would upload over each other, so that's an error. */
export async function findOriginals(folder: string): Promise<Originals> {
  const files: Map<string, string> = new Map();
  const errors: string[] = [];
  const names: string[] = (await readdir(folder)).sort();
  for (const name of names) {
    if (!IMAGE_EXTENSIONS.has(extname(name).toLowerCase())) {
      continue;
    }
    const key: string = parse(name).name;
    const existing: string | undefined = files.get(key);
    if (existing) {
      errors.push(`${join(folder, name)}: same key as ${existing}`);
      continue;
    }
    files.set(key, join(folder, name));
  }
  return { files, errors };
}
