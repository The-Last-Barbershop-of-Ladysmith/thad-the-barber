import AxeBuilder from '@axe-core/playwright';
import {
  type Page,
  expect,
  test,
} from '@playwright/test';
import {
  type AxeResults,
  type NodeResult,
  type Result,
} from 'axe-core';
import {
  KNOWN_A11Y_ISSUES,
  type KnownA11yIssue,
} from './known-a11y-issues';

interface ViolationSummary {
  id: string;
  impact: Result['impact'];
  help: string;
  targets: string[];
}

/**
 * Fails on any WCAG 2.2 A/AA violation not listed in KNOWN_A11Y_ISSUES. `region` is a best-practice rule outside
 * those tags, so it is turned on by name. `incomplete` results (contrast over the backdrop, images, glass) are
 * attached for a manual check.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results: AxeResults = await new AxeBuilder({ page })
    .options({
      runOnly: {
        type: 'tag',
        values: [
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22aa',
        ],
      },
      rules: { region: { enabled: true } },
    })
    .analyze();

  if (results.incomplete.length > 0) {
    await test.info().attach(
      `axe incomplete (needs review): ${page.url()}`,
      {
        body: JSON.stringify(
          results.incomplete,
          null,
          2,
        ),
        contentType: 'application/json',
      },
    );
  }

  const unknown: ViolationSummary[] = [];
  const known: (ViolationSummary & { issue: string; })[] = [];
  for (const violation of results.violations) {
    const summary: ViolationSummary = {
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node: NodeResult): string => node.target.join(' ')),
    };
    const issue: KnownA11yIssue | undefined = await findKnownIssue(
      page,
      summary,
    );
    if (issue) {
      known.push({
        ...summary,
        issue: issue.issue,
      });
    } else {
      unknown.push(summary);
    }
  }

  if (known.length > 0) {
    await test.info().attach(
      `axe known issues: ${page.url()}`,
      {
        body: JSON.stringify(
          known,
          null,
          2,
        ),
        contentType: 'application/json',
      },
    );
  }

  expect(
    unknown,
    `axe violations on ${page.url()}`,
  ).toEqual([]);
}

async function findKnownIssue(
  page: Page,
  violation: ViolationSummary,
): Promise<KnownA11yIssue | undefined> {
  for (const known of KNOWN_A11Y_ISSUES.filter((issue: KnownA11yIssue): boolean => issue.rule === violation.id)) {
    const allMatch: boolean = await page.evaluate(
      ({
        targets,
        selector,
      }: {
        targets: string[];
        selector: string;
      }): boolean => targets.every((target: string): boolean => !!document.querySelector(target)?.matches(selector)),
      {
        targets: violation.targets,
        selector: known.selector,
      },
    );
    if (allMatch) {
      return known;
    }
  }
  return undefined;
}
