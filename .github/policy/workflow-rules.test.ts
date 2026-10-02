import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';
import { workflowViolations } from './workflow-rules.ts';

const sha: string = '3d3c42e5aac5ba805825da76410c181273ba90b1';

describe('workflowViolations', (): void => {
  it('accepts SHA-pinned actions, local actions and a permissions block', (): void => {
    const text: string = [
      'on: pull_request',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  build:',
      '    steps:',
      `      - uses: actions/checkout@${sha} # v7.0.1`,
      '      - uses: ./.github/actions/local',
      `    uses: org/repo/.github/workflows/reusable.yml@${sha}`,
    ].join('\n');
    assert.deepEqual(workflowViolations('ok.yml', text), []);
  });

  it('flags tag and branch refs', (): void => {
    const text: string = [
      'permissions: {}',
      '      - uses: actions/checkout@v7',
      "      - uses: 'azure/login@main'",
    ].join('\n');
    assert.deepEqual(workflowViolations('tags.yml', text), [
      'tags.yml:2: actions/checkout@v7 is not pinned to a commit SHA',
      'tags.yml:3: azure/login@main is not pinned to a commit SHA',
    ]);
  });

  it('flags a missing top-level permissions block, even when a job has one', (): void => {
    const text: string = [
      'jobs:',
      '  build:',
      '    permissions:',
      '      contents: read',
    ].join('\n');
    assert.deepEqual(workflowViolations('perms.yml', text), ['perms.yml: no top-level permissions block']);
  });

  it('flags pull_request_target', (): void => {
    const text: string = [
      'on:',
      '  pull_request_target:',
      'permissions: {}',
    ].join('\r\n');
    assert.deepEqual(workflowViolations('prt.yml', text), ['prt.yml:2: pull_request_target is not allowed']);
  });
});
