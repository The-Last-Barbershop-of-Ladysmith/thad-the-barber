import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';

export interface CheckedContent {
  /** File name → parsed document, for the files that passed their schema. */
  valid: Map<string, unknown>;
  errors: string[];
}

/** Checks every `<name>.json` in `contentDir` against `schemas/<name>.schema.json`. A file without a schema fails. */
export async function checkContent(contentDir: string): Promise<CheckedContent> {
  const ajv: Ajv2020 = new Ajv2020({ allErrors: true });
  const valid: Map<string, unknown> = new Map();
  const errors: string[] = [];
  const files: string[] = (await readdir(contentDir)).filter((name: string): boolean => name.endsWith('.json')).sort();
  for (const file of files) {
    const schemaPath: string = join(contentDir, 'schemas', file.replace(/\.json$/, '.schema.json'));
    let schema: object;
    try {
      schema = JSON.parse(await readFile(schemaPath, 'utf8')) as object;
    } catch {
      errors.push(`${file}: no schema at ${schemaPath}`);
      continue;
    }
    const document: unknown = JSON.parse(await readFile(join(contentDir, file), 'utf8'));
    const validate: ReturnType<Ajv2020['compile']> = ajv.compile(schema);
    if (validate(document)) {
      valid.set(file, document);
    } else {
      errors.push(...(validate.errors ?? []).map(
        (error: ErrorObject): string => `${file}${error.instancePath} ${error.message ?? 'is invalid'}`,
      ));
    }
  }
  return { valid, errors };
}
