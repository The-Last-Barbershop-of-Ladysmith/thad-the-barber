import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface RunReport {
  categories: { performance: { score: number | null; }; };
  audits: { 'cumulative-layout-shift': { numericValue: number; }; };
}

interface MedianRuns {
  runCount: number;
  performance: number;
  layoutShift: number;
}

function median(values: number[]): number {
  const sortedValues: number[] = [...values].sort((first: number, second: number): number => first - second);
  return sortedValues[Math.floor(sortedValues.length / 2)] ?? 0;
}

/**
 * Median performance score and layout shift over the repeated runs of one page (`runs/<name>-<n>.report.json`),
 * because a single run on a shared CI runner swings by 10 points or more. Undefined when the page has no repeated runs.
 */
export function readMedianRuns(reportDir: string, name: string): MedianRuns | undefined {
  const runDir: string = join(reportDir, 'runs');
  if (!existsSync(runDir)) {
    return undefined;
  }
  const runFiles: string[] = readdirSync(runDir).filter(
    (file: string): boolean => file.startsWith(`${name}-`) && file.endsWith('.report.json'),
  );
  if (runFiles.length === 0) {
    return undefined;
  }
  const reports: RunReport[] = runFiles.map(
    (file: string): RunReport => JSON.parse(readFileSync(join(runDir, file), 'utf8')) as RunReport,
  );
  return {
    runCount: reports.length,
    performance: median(reports.map((report: RunReport): number => report.categories.performance.score ?? 0)),
    layoutShift: median(reports.map((report: RunReport): number => report.audits['cumulative-layout-shift'].numericValue)),
  };
}
