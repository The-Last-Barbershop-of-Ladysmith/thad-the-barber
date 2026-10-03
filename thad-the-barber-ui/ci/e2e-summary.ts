/**
 * Turns the CI run's Playwright JSON report (playwright.config.ts) into Markdown for the job summary and the PR
 * comment: the totals, plus each failed or flaky test with its project. Run with `npm run e2e:summary`.
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

interface TestResult { status: string; }

interface Test {
  projectName: string;
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  results: TestResult[];
}

interface Spec {
  title: string;
  file: string;
  tests: Test[];
}

interface Suite {
  title: string;
  specs?: Spec[];
  suites?: Suite[];
}

interface JsonReport {
  stats: {
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
    duration: number;
  };
  suites: Suite[];
}

const reportPath: string = process.argv[2] ?? 'test-results/results.json';
const summaryPath: string = process.argv[3] ?? 'test-results/summary.md';

function problemTests(suites: Suite[], titles: string[]): string[] {
  return suites.flatMap((suite: Suite): string[] => {
    const path: string[] = suite.title === '' || suite.title.endsWith('.ts')
      ? titles
      : [...titles, suite.title];
    const own: string[] = (suite.specs ?? []).flatMap((spec: Spec): string[] => spec.tests
      .filter((test: Test): boolean => test.status === 'unexpected' || test.status === 'flaky')
      .map((test: Test): string => `- ${test.status === 'flaky' ? '⚠️ flaky' : '❌'} \`${test.projectName}\` ${spec.file} › ${[...path, spec.title].join(' › ')}`));
    return own.concat(problemTests(suite.suites ?? [], path));
  });
}

const lines: string[] = ['### Playwright (mocked API)'];

if (existsSync(reportPath)) {
  const report: JsonReport = JSON.parse(readFileSync(reportPath, 'utf8')) as JsonReport;
  const { stats }: JsonReport = report;
  lines.push(
    '',
    `✅ ${stats.expected} passed · ❌ ${stats.unexpected} failed · ⚠️ ${stats.flaky} flaky · ${stats.skipped} skipped · ${Math.round(stats.duration / 1000)} s`,
    ...problemTests(report.suites, []),
  );
} else {
  lines.push('', 'No report: the suite didn\'t run (see the job log).');
}

writeFileSync(summaryPath, `${lines.join('\n')}\n`);
