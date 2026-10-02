/**
 * Workflow hardening rules (issue #18), checked on every PR by policy-tests.yml through workflow-check.ts.
 * Line-based on purpose: the rules only need `uses:` lines and top-level keys, so no YAML parser is needed.
 */

const pinnedAction: RegExp = /^[^@\s]+@[0-9a-f]{40}$/;

export function workflowViolations(fileName: string, text: string): string[] {
  const lines: string[] = text.split(/\r?\n/);
  const violations: string[] = [];

  if (!lines.some((line: string): boolean => line.startsWith('permissions:'))) {
    violations.push(`${fileName}: no top-level permissions block`);
  }

  lines.forEach((line: string, index: number): void => {
    if (/^\s*pull_request_target\s*:/.test(line)) {
      violations.push(`${fileName}:${index + 1}: pull_request_target is not allowed`);
    }

    const uses: string | undefined = /^\s*(?:-\s+)?uses:\s*['"]?([^'"\s#]+)/.exec(line)?.[1];
    if (uses !== undefined && !uses.startsWith('./') && !uses.startsWith('docker://') && !pinnedAction.test(uses)) {
      violations.push(`${fileName}:${index + 1}: ${uses} is not pinned to a commit SHA`);
    }
  });

  return violations;
}
