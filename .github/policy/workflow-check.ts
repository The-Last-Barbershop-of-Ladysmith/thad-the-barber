import {
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { workflowViolations } from './workflow-rules.ts';

const workflowDir: string = join(import.meta.dirname, '..', 'workflows');
const violations: string[] = readdirSync(workflowDir)
  .filter((name: string): boolean => /\.ya?ml$/.test(name))
  .flatMap((name: string): string[] => workflowViolations(name, readFileSync(join(workflowDir, name), 'utf8')));

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
}
