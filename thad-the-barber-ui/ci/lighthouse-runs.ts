import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface RunReport {
  categories: { performance: { score: number | null; }; };
  audits: { 'cumulative-layout-shift': { numericValue: number; }; };
}

interface MedianRuns {
  performance: number;
  layoutShift: number;
}

function median(values: number[]): number {
  const sortedValues: number[] = [...values].sort((first: number, second: number): number => first - second);
  return sortedValues[Math.floor(sortedValues.length / 2)] ?? 0;
}

/**
 * Median performance score and layout shift of one page over its full report (`<name>.report.json`) and any repeat
 * runs (`runs/<name>-<n>.report.json`), because a single run on a shared CI runner swings by 10 points or more.
 */
export function readMedianRuns(reportDir: string, name: string): MedianRuns {
  const runDir: string = join(reportDir, 'runs');
  const repeatFiles: string[] = existsSync(runDir)
    ? readdirSync(runDir).filter((file: string): boolean => file.startsWith(`${name}-`) && file.endsWith('.report.json'))
    : [];
  const reportPaths: string[] = [
    join(reportDir, `${name}.report.json`),
    ...repeatFiles.map((file: string): string => join(runDir, file)),
  ];
  const reports: RunReport[] = reportPaths.map(
    (reportPath: string): RunReport => JSON.parse(readFileSync(reportPath, 'utf8')) as RunReport,
  );
  return {
    performance: median(reports.map((report: RunReport): number => report.categories.performance.score ?? 0)),
    layoutShift: median(reports.map((report: RunReport): number => report.audits['cumulative-layout-shift'].numericValue)),
  };
}
