/**
 * Entry point for .github/workflows/policy-alert.yml. Runs on Node 24 (native type
 * stripping, no dependencies). Reads the push or merged-PR event, gathers the facts
 * from the GitHub API, applies policy.ts, and on a violation opens or updates one
 * `policy-violation` issue per branch and comments on the PR. It never reverts.
 */
import {
  appendFileSync,
  readFileSync,
} from 'node:fs';
import type {
  CheckRun,
  MergeInput,
  PolicyInput,
  PushInput,
  Violation,
} from './policy.ts';
import {
  evaluate,
  formatReport,
  issueTitle,
  targetBranch,
} from './policy.ts';

interface Issue {
  number: number;
  title: string;
}

interface PullSummary {
  number: number;
  merged_at: string | null;
}

interface PushEvent {
  ref: string;
  after: string;
  created: boolean;
  deleted: boolean;
}

interface PullRequestEvent {
  pull_request: {
    number: number;
    merged: boolean;
    merge_commit_sha: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
}

const env: NodeJS.ProcessEnv = process.env;
const repo: string = env['GITHUB_REPOSITORY'] ?? '';
const token: string = env['GITHUB_TOKEN'] ?? '';
const api: string = env['GITHUB_API_URL'] ?? 'https://api.github.com';
const runUrl: string = `${env['GITHUB_SERVER_URL'] ?? 'https://github.com'}/${repo}/actions/runs/${env['GITHUB_RUN_ID'] ?? ''}`;
const owner: string = env['POLICY_OWNER'] ?? '';
const LABEL: string = 'policy-violation';

async function gh<T>(method: string, path: string, body?: object): Promise<T> {
  const response: Response = await fetch(`${api}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve: () => void): void => {
    setTimeout(resolve, ms);
  });
}

/** GitHub can take a few seconds to link a fresh merge commit to its PR, so retry before calling it a direct push. */
async function linkedPulls(sha: string): Promise<number[]> {
  for (let attempt: number = 0; attempt < 4; attempt++) {
    const pulls: PullSummary[] = await gh<PullSummary[]>('GET', `/repos/${repo}/commits/${sha}/pulls`);
    const merged: number[] = pulls
      .filter((pull: PullSummary): boolean => pull.merged_at !== null)
      .map((pull: PullSummary): number => pull.number);
    if (merged.length > 0) {
      return merged;
    }
    await sleep(10_000);
  }
  return [];
}

async function pushInput(event: PushEvent): Promise<PushInput> {
  const skip: boolean = event.created || event.deleted;
  return {
    kind: 'push',
    branch: event.ref.replace('refs/heads/', ''),
    sha: event.after,
    created: event.created,
    deleted: event.deleted,
    linkedPullNumbers: skip ? [] : await linkedPulls(event.after),
  };
}

async function mergeInput(event: PullRequestEvent): Promise<MergeInput> {
  const pr: PullRequestEvent['pull_request'] = event.pull_request;
  const requiredChecks: string[] = (env['REQUIRED_CHECKS'] ?? '')
    .split(',')
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name.length > 0);
  const commit: { parents: object[] } = await gh<{ parents: object[] }>('GET', `/repos/${repo}/commits/${pr.merge_commit_sha}`);
  const checkRuns: CheckRun[] = requiredChecks.length === 0
    ? []
    : (await gh<{ check_runs: CheckRun[] }>('GET', `/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`)).check_runs;
  return {
    kind: 'merge',
    pullNumber: pr.number,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    mergeCommitSha: pr.merge_commit_sha,
    parentCount: commit.parents.length,
    checkRuns,
    requiredChecks,
  };
}

async function raiseAlert(input: PolicyInput, violations: Violation[]): Promise<void> {
  const report: string = formatReport(input, violations, runUrl);
  const title: string = issueTitle(targetBranch(input));
  const open: Issue[] = await gh<Issue[]>('GET', `/repos/${repo}/issues?labels=${LABEL}&state=open&per_page=100`);
  const existing: Issue | undefined = open.find((issue: Issue): boolean => issue.title === title);
  if (existing) {
    await gh<object>('POST', `/repos/${repo}/issues/${existing.number}/comments`, { body: report });
    console.log(`Updated #${existing.number}`);
  } else {
    const created: Issue = await gh<Issue>('POST', `/repos/${repo}/issues`, {
      title,
      body: report,
      labels: [LABEL],
      assignees: owner ? [owner] : [],
    });
    console.log(`Opened #${created.number}`);
  }
  if (input.kind === 'merge') {
    await gh<object>('POST', `/repos/${repo}/issues/${input.pullNumber}/comments`, { body: `⚠️ Merge-policy alert\n\n${report}` });
  }
}

async function main(): Promise<void> {
  const eventName: string = env['GITHUB_EVENT_NAME'] ?? '';
  const event: unknown = JSON.parse(readFileSync(env['GITHUB_EVENT_PATH'] ?? '', 'utf8'));
  let input: PolicyInput;
  if (eventName === 'push') {
    input = await pushInput(event as PushEvent);
  } else if (eventName === 'pull_request' && (event as PullRequestEvent).pull_request.merged) {
    input = await mergeInput(event as PullRequestEvent);
  } else {
    console.log(`Nothing to check for ${eventName}.`);
    return;
  }

  const violations: Violation[] = evaluate(input);
  const summary: string = violations.length === 0
    ? `No merge-policy violations on \`${targetBranch(input)}\`.`
    : formatReport(input, violations, runUrl);
  if (env['GITHUB_STEP_SUMMARY']) {
    appendFileSync(env['GITHUB_STEP_SUMMARY'], `${summary}\n`);
  }
  console.log(summary);
  if (violations.length > 0) {
    for (const violation of violations) {
      console.log(`::warning title=${violation.kind}::${violation.message}`);
    }
    await raiseAlert(input, violations);
  }
}

await main();
