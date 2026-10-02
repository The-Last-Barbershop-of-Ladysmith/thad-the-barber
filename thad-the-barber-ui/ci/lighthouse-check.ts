import {
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

interface Category {
  id: string;
  title: string;
  score: number | null;
}

interface Report {
  finalDisplayedUrl: string;
  categories: Record<string, Category>;
}

// Performance is reported but not enforced yet: the backdrop frames sink it until #47 and #38 land,
// and #91 sets the real budgets (LCP, CLS, INP).
const minimums: Record<string, number> = {
  accessibility: 0.95,
  'best-practices': 0.9,
  seo: 0.9,
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
  const report: Report = JSON.parse(readFileSync(
    join(
      reportDir,
      file,
    ),
    'utf8',
  )) as Report;
  const path: string = new URL(report.finalDisplayedUrl).pathname;
  const cells: string[] = [];
  header = Object.values(report.categories).map((category: Category): string => category.title);

  for (const category of Object.values(report.categories)) {
    const score: number = Math.round((category.score ?? 0) * 100);
    const minimum: number | undefined = minimums[category.id];
    const limit: number | undefined = minimum === undefined ? undefined : minimum * 100;
    const failed: boolean = limit !== undefined && score < limit;
    process.stdout.write(`${failed ? 'FAIL' : 'ok  '} ${path} ${category.id} ${score} (${limit === undefined ? 'not enforced' : `min ${limit}`})\n`);
    cells.push(limit === undefined ? `${score} (not enforced)` : `${failed ? '❌' : '✅'} ${score} (min ${limit})`);
    if (failed) {
      failures.push(`${path} ${category.id} ${score} < ${limit}`);
    }
  }
  rows.push(`| \`${path}\` | ${cells.join(' | ')} |`);
}

writeFileSync(
  join(
    reportDir,
    'summary.md',
  ),
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
