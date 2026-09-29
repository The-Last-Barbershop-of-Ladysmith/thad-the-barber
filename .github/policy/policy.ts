/**
 * Merge-policy rules (issue #3). Pure functions only: policy-check.ts gathers the
 * input from GitHub, and policy.test.ts runs these rules against fixture payloads.
 * The repo is private on the Free plan, so rulesets can't block a merge; these
 * rules only raise an alert.
 */

export type BranchKind = 'main' | 'release' | 'dev' | 'topic' | 'hotfix' | 'other';

export type ViolationKind = 'direct-push' | 'check-failed' | 'check-missing' | 'wrong-merge-style' | 'wrong-target';

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface PushInput {
  kind: 'push';
  branch: string;
  sha: string;
  created: boolean;
  deleted: boolean;
  linkedPullNumbers: number[];
}

export interface MergeInput {
  kind: 'merge';
  pullNumber: number;
  headBranch: string;
  baseBranch: string;
  mergeCommitSha: string;
  parentCount: number;
  checkRuns: CheckRun[];
  requiredChecks: string[];
}

export type PolicyInput = PushInput | MergeInput;

export interface Violation {
  kind: ViolationKind;
  message: string;
}

const PASSING_CONCLUSIONS: string[] = [
  'success',
  'neutral',
  'skipped',
];

/** Allowed head → base pairs for merged PRs. */
const ALLOWED_TARGETS: Record<BranchKind, BranchKind[]> = {
  topic: ['dev'],
  hotfix: ['release'],
  dev: ['release'],
  release: [
    'main',
    'dev',
  ],
  main: ['dev'],
  other: [],
};

/** Long-lived branches keep history, so merges between them must be merge commits. */
const LONG_LIVED: BranchKind[] = [
  'main',
  'release',
  'dev',
];

export function branchKind(name: string): BranchKind {
  if (name === 'main') {
    return 'main';
  }
  const prefix: string = name.split('/')[0]?.toLowerCase() ?? '';
  if (prefix === 'release' || prefix === 'dev' || prefix === 'topic' || prefix === 'hotfix') {
    return prefix;
  }
  return 'other';
}

export function isWatched(branch: string): boolean {
  return LONG_LIVED.includes(branchKind(branch));
}

function evaluatePush(input: PushInput): Violation[] {
  if (!isWatched(input.branch) || input.created || input.deleted) {
    return [];
  }
  if (input.linkedPullNumbers.length > 0) {
    return [];
  }
  return [
    {
      kind: 'direct-push',
      message: `Commit ${input.sha.slice(0, 7)} was pushed straight to \`${input.branch}\` without a merged pull request.`,
    },
  ];
}

function evaluateChecks(input: MergeInput): Violation[] {
  const violations: Violation[] = [];
  for (const name of input.requiredChecks) {
    const runs: CheckRun[] = input.checkRuns.filter((run: CheckRun): boolean => run.name === name);
    if (runs.length === 0) {
      violations.push({
        kind: 'check-missing',
        message: `Required check \`${name}\` never ran on the PR's head commit.`,
      });
      continue;
    }
    const passed: boolean = runs.every(
      (run: CheckRun): boolean => run.status === 'completed' && PASSING_CONCLUSIONS.includes(run.conclusion ?? ''),
    );
    if (!passed) {
      const states: string = runs.map((run: CheckRun): string => run.conclusion ?? run.status).join(', ');
      violations.push({
        kind: 'check-failed',
        message: `Required check \`${name}\` wasn't passing when the PR merged (${states}).`,
      });
    }
  }
  return violations;
}

function evaluateMerge(input: MergeInput): Violation[] {
  if (!isWatched(input.baseBranch)) {
    return [];
  }
  const head: BranchKind = branchKind(input.headBranch);
  const base: BranchKind = branchKind(input.baseBranch);
  const violations: Violation[] = [];

  if (!ALLOWED_TARGETS[head].includes(base)) {
    const allowed: string = ALLOWED_TARGETS[head].join(' or ') || 'nothing';
    violations.push({
      kind: 'wrong-target',
      message: `\`${input.headBranch}\` was merged into \`${input.baseBranch}\`; a ${head} branch may only merge into ${allowed}.`,
    });
  }

  const isMergeCommit: boolean = input.parentCount > 1;
  if (head === 'topic' && base === 'dev' && isMergeCommit) {
    violations.push({
      kind: 'wrong-merge-style',
      message: 'A topic branch was merged into dev with a merge commit; topic → dev must be a squash merge.',
    });
  }
  if (LONG_LIVED.includes(head) && LONG_LIVED.includes(base) && !isMergeCommit) {
    violations.push({
      kind: 'wrong-merge-style',
      message: `\`${input.headBranch}\` → \`${input.baseBranch}\` was squashed or rebased; merges between long-lived branches must be merge commits.`,
    });
  }

  return violations.concat(evaluateChecks(input));
}

export function evaluate(input: PolicyInput): Violation[] {
  return input.kind === 'push' ? evaluatePush(input) : evaluateMerge(input);
}

export function revertCommand(sha: string, parentCount: number): string {
  return parentCount > 1 ? `git revert -m 1 ${sha}` : `git revert ${sha}`;
}

/** One open issue per branch, so repeat violations update it instead of adding more. */
export function issueTitle(branch: string): string {
  return `Policy violation on ${branch}`;
}

export function targetBranch(input: PolicyInput): string {
  return input.kind === 'push' ? input.branch : input.baseBranch;
}

export function formatReport(input: PolicyInput, violations: Violation[], runUrl: string): string {
  const sha: string = input.kind === 'push' ? input.sha : input.mergeCommitSha;
  const parents: number = input.kind === 'push' ? 1 : input.parentCount;
  const source: string = input.kind === 'push'
    ? `Direct push of ${sha.slice(0, 7)} to \`${input.branch}\``
    : `PR #${input.pullNumber} (\`${input.headBranch}\` → \`${input.baseBranch}\`), merge commit ${sha.slice(0, 7)}`;
  const lines: string[] = [
    `**${source}**`,
    '',
    ...violations.map((violation: Violation): string => `- **${violation.kind}**: ${violation.message}`),
    '',
    'If this wasn\'t intended, revert it on the branch:',
    '',
    '```sh',
    revertCommand(sha, parents),
    '```',
    '',
    `Found by the [policy-alert run](${runUrl}). This is an alert only; nothing was reverted.`,
  ];
  return lines.join('\n');
}
