import { appendFileSync } from 'node:fs';
import { ConsoleMessage, Page, Request, TestInfo, test } from '@playwright/test';

interface Finding {
  where: string;
  kind: string;
  text: string;
}

const PAGES: string[] = [
  '/',
  '/book',
  '/book/manage',
  '/contact',
  '/privacy',
  '/accessibility',
];

/** The browser logs the 404 page's own status as an error; that is the page working, not a problem. */
const NOT_FOUND_PATH: string = '/nothing-here';

/** Background images and frames cancelled by leaving the page are not failures. */
const CANCELLED: string = 'net::ERR_ABORTED';

const MAX_TEXT: number = 300;

/** Text for a markdown table cell: backslashes first, so the escape added for a pipe is not itself undone. */
function toTableCell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * An audit, not a gate (yet): visits every page of the deployed site, and the booking steps, with its real reCAPTCHA,
 * telemetry and API, and lists every console warning and error, page error and failed request. The list goes to the
 * run's summary and as warning annotations, so it is read in the CI run; a failing check would block deploys while
 * the first list is still unread. Make it fail once the list is clean.
 */
test.describe(
  'console',
  (): void => {
    test(
      'lists the console warnings and errors on every page',
      async ({ page }: { page: Page; }, testInfo: TestInfo): Promise<void> => {
        const findings: Finding[] = [];
        let where: string = '';
        page.on('console', (message: ConsoleMessage): void => {
          if (message.type() === 'warning' || message.type() === 'error') {
            findings.push({
              where,
              kind: `console ${message.type()}`,
              text: message.text().slice(0, MAX_TEXT),
            });
          }
        });
        page.on('pageerror', (error: Error): void => {
          findings.push({
            where,
            kind: 'page error',
            text: error.message.slice(0, MAX_TEXT),
          });
        });
        page.on('requestfailed', (request: Request): void => {
          const reason: string = request.failure()?.errorText ?? 'failed';
          if (reason !== CANCELLED) {
            findings.push({
              where,
              kind: 'request failed',
              text: `${request.url().slice(0, 150)} ${reason}`,
            });
          }
        });

        for (const path of PAGES) {
          where = path;
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          await page.evaluate((): void => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(1_000);
        }

        where = `${NOT_FOUND_PATH} (its own 404 status is left out)`;
        await page.goto(NOT_FOUND_PATH);
        await page.waitForLoadState('networkidle');

        where = '/book (picking a day and time)';
        await page.goto('/book');
        await page.waitForLoadState('networkidle');
        const openDays: ReturnType<Page['locator']> = page.locator(
          '[data-testid="date-picker"] td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)',
        );
        if (await openDays.count() > 0) {
          await openDays.first().click();
          await page.locator('[data-testid="time-list"] [role="button"]').first().click();
          await page.locator('#booking-name').fill('Console Check');
          await page.locator('#booking-text-consent').focus();
          await page.keyboard.press('Tab');
          await page.waitForTimeout(1_000);
        }

        const unique: Finding[] = findings.filter(
          (finding: Finding, index: number): boolean => findings.findIndex(
            (other: Finding): boolean => other.where === finding.where && other.text === finding.text,
          ) === index,
        );
        const lines: string[] = unique.map((finding: Finding): string => `${finding.where} | ${finding.kind} | ${finding.text}`);
        const report: string = lines.length > 0 ? lines.join('\n') : 'No console warnings, errors, page errors or failed requests.';

        await testInfo.attach('console-findings.txt', { body: report, contentType: 'text/plain' });
        process.stdout.write(`\nConsole audit of ${page.url()}\n${report}\n`);
        for (const line of lines) {
          process.stdout.write(`::warning title=Console::${line.replace(/\n/g, ' ')}\n`);
        }

        const summaryFile: string | undefined = process.env['GITHUB_STEP_SUMMARY'];
        if (summaryFile) {
          const rows: string[] = unique.map(
            (finding: Finding): string => `| \`${finding.where}\` | ${finding.kind} | ${toTableCell(finding.text)} |`,
          );
          appendFileSync(
            summaryFile,
            unique.length > 0
              ? `### Console audit (${unique.length})\n\n| Page | Kind | Message |\n| --- | --- | --- |\n${rows.join('\n')}\n`
              : '### Console audit\n\nNo console warnings, errors, page errors or failed requests.\n',
          );
        }
      },
    );
  },
);
