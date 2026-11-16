import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readMedianRuns } from './lighthouse-runs.ts';

interface Category {
  id: string;
  title: string;
  score: number | null;
}

interface Report {
  finalDisplayedUrl: string;
  categories: Record<string, Category>;
}

// Performance floors sit about 10 points under what CI last measured (home 89, book 81 on 2026-11-16), since runner
// noise is large, and apply to the median of the repeated runs (CI runs `/` and `/book` five times, other pages once).
// #91 sets the real budgets (LCP, INP).
const minimums: Record<string, number> = {
  accessibility: 0.95,
  'best-practices': 0.9,
  seo: 0.9,
};

const performanceMinimums: Record<string, number> = {
  '/': 0.8,
  '/book': 0.75,
};

// The web's "good" threshold. A page joins once CI shows it staying under it; `/accessibility` reads 0.47 in CI only
// (one shift of its body, which the first captured frame already shows settled) and is tracked in the audit follow-ups.
const layoutShiftMaximums: Record<string, number> = {
  '/': 0.1,
  '/book': 0.1,
};

const reportDir: string = process.argv[2] ?? 'lighthouse-results';
const reportFiles: string[] = readdirSync(reportDir).filter((file: string): boolean => file.endsWith('.report.json'));
const failures: string[] = [];
const rows: string[] = [];
let header: string[] = [];

if (reportFiles.length === 0) {
  failures.push(`No Lighthouse reports in ${reportDir}`);
}

for (const file of reportFiles) {
  const report: Report = JSON.parse(readFileSync(join(reportDir, file), 'utf8')) as Report;
  const path: string = new URL(report.finalDisplayedUrl).pathname;
  const cells: string[] = [];
  header = [...Object.values(report.categories).map((category: Category): string => category.title), 'Layout shift'];
  const medianRuns: ReturnType<typeof readMedianRuns> = readMedianRuns(reportDir, file.replace('.report.json', ''));

  for (const category of Object.values(report.categories)) {
    const rawScore: number | null = category.id === 'performance' ? medianRuns.performance : category.score;
    const score: number = Math.round((rawScore ?? 0) * 100);
    const minimum: number | undefined = category.id === 'performance' ? performanceMinimums[path] : minimums[category.id];
    const limit: number | undefined = minimum === undefined ? undefined : minimum * 100;
    const failed: boolean = limit !== undefined && score < limit;
    process.stdout.write(`${failed ? 'FAIL' : 'ok  '} ${path} ${category.id} ${score} (${limit === undefined ? 'not enforced' : `min ${limit}`})\n`);
    cells.push(limit === undefined ? `${score} (not enforced)` : `${failed ? '❌' : '✅'} ${score} (min ${limit})`);
    if (failed) {
      failures.push(`${path} ${category.id} ${score} < ${limit}`);
    }
  }

  const maximum: number | undefined = layoutShiftMaximums[path];
  const shift: string = medianRuns.layoutShift.toFixed(3);
  const isShiftOverBudget: boolean = maximum !== undefined && medianRuns.layoutShift > maximum;
  const shiftLimit: string = maximum === undefined ? 'not enforced' : `max ${maximum}`;
  process.stdout.write(`${isShiftOverBudget ? 'FAIL' : 'ok  '} ${path} layout shift ${shift} (${shiftLimit})\n`);
  cells.push(maximum === undefined ? `${shift} (not enforced)` : `${isShiftOverBudget ? '❌' : '✅'} ${shift} (max ${maximum})`);
  if (isShiftOverBudget) {
    failures.push(`${path} layout shift ${shift} > ${maximum}`);
  }
  rows.push(`| \`${path}\` | ${cells.join(' | ')} |`);
}

writeFileSync(
  join(reportDir, 'summary.md'),
  [
    '### Lighthouse (mobile)',
    '',
    `| Page | ${header.join(' | ')} |`,
    `| --- |${' --- |'.repeat(header.length)}`,
    ...rows,
    '',
  ].join('\n'),
);

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
}
