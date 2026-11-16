import axe, { AxeResults, NodeResult, Result, RunOptions } from 'axe-core';

export const AXE_OPTIONS: RunOptions = {
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
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
};

export async function expectNoAxeViolations(target: Element): Promise<void> {
  const results: AxeResults = await axe.run(
    target,
    AXE_OPTIONS,
  );
  if (results.violations.length > 0) {
    throw new Error(`axe found ${results.violations.length} violation(s):\n${results.violations.map(describeViolation).join('\n')}`);
  }
}

function describeViolation(violation: Result): string {
  const selectors: string = violation.nodes
    .map((node: NodeResult): string => node.target.join(' '))
    .join(', ');
  return `- ${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.helpUrl}\n  ${selectors}`;
}
