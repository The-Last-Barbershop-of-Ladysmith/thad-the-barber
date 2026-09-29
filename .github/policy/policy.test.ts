import assert from 'node:assert/strict';
import {
  readdirSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  describe,
  it,
} from 'node:test';
import type {
  PolicyInput,
  Violation,
  ViolationKind,
} from './policy.ts';
import {
  branchKind,
  evaluate,
  formatReport,
  issueTitle,
  revertCommand,
} from './policy.ts';

interface Fixture {
  description: string;
  input: PolicyInput;
  expected: ViolationKind[];
}

const fixtureDir: string = join(import.meta.dirname, 'fixtures');

describe('evaluate (fixture payloads)', (): void => {
  for (const file of readdirSync(fixtureDir).filter((name: string): boolean => name.endsWith('.json'))) {
    const fixture: Fixture = JSON.parse(readFileSync(join(fixtureDir, file), 'utf8')) as Fixture;
    it(`${file}: ${fixture.description}`, (): void => {
      const kinds: ViolationKind[] = evaluate(fixture.input).map((violation: Violation): ViolationKind => violation.kind);
      assert.deepEqual(kinds, fixture.expected);
    });
  }
});

describe('branchKind', (): void => {
  it('treats Topic/ and topic/ the same', (): void => {
    assert.equal(branchKind('Topic/3-branching-setup'), 'topic');
    assert.equal(branchKind('topic/3-branching-setup'), 'topic');
  });

  it('recognizes long-lived and hotfix branches', (): void => {
    assert.equal(branchKind('main'), 'main');
    assert.equal(branchKind('dev/angry-apple-1.0.0.0'), 'dev');
    assert.equal(branchKind('release/angry-apple-1.0.0.0'), 'release');
    assert.equal(branchKind('hotfix/1.0.1-typo'), 'hotfix');
    assert.equal(branchKind('feature/x'), 'other');
  });
});

describe('report', (): void => {
  it('uses -m 1 to revert a merge commit', (): void => {
    assert.equal(revertCommand('abc', 2), 'git revert -m 1 abc');
    assert.equal(revertCommand('abc', 1), 'git revert abc');
  });

  it('keys the alert issue by branch so repeats update one issue', (): void => {
    assert.equal(issueTitle('dev/angry-apple-1.0.0.0'), 'Policy violation on dev/angry-apple-1.0.0.0');
  });

  it('includes each violation, the revert command and the run link', (): void => {
    const input: PolicyInput = {
      kind: 'push',
      branch: 'dev/angry-apple-1.0.0.0',
      sha: 'f00dcafe1234567',
      created: false,
      deleted: false,
      linkedPullNumbers: [],
    };
    const report: string = formatReport(input, evaluate(input), 'https://example.test/run/1');
    assert.match(report, /direct-push/);
    assert.match(report, /git revert f00dcafe1234567/);
    assert.match(report, /https:\/\/example\.test\/run\/1/);
  });
});
