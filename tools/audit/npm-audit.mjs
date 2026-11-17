// Runs `npm audit` in the current folder and fails on a high or critical advisory, except those listed (with a reason and
// an expiry date) in exceptions.json. An expired exception counts as a failure again, so none can be forgotten.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failingSeverities = new Set(['high', 'critical']);
const exceptions = JSON.parse(readFileSync(new URL('./exceptions.json', import.meta.url), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const active = new Map();
for (const exception of exceptions) {
  if (exception.expires >= today) {
    active.set(exception.advisory, exception);
  } else {
    console.log(`Exception for ${exception.advisory} expired on ${exception.expires}; it no longer applies.`);
  }
}

const run = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
const report = JSON.parse(run.stdout);
if (report.error) {
  console.error(`npm audit could not run: ${report.error.summary}`);
  process.exit(1);
}
const vulnerabilities = report.vulnerabilities ?? {};

// A package is excused when every advisory against it is excepted and every vulnerable package it depends on is excused.
const excused = (name, seen = new Set()) => {
  if (seen.has(name)) {
    return true;
  }
  seen.add(name);
  const entry = vulnerabilities[name];
  return entry.via.every((via) => {
    if (typeof via === 'string') {
      return vulnerabilities[via] === undefined || excused(via, seen);
    }
    return active.has(via.url?.split('/').pop());
  });
};

const failures = Object.entries(vulnerabilities).filter(
  ([name, entry]) => failingSeverities.has(entry.severity) && !excused(name)
);
const excusedHigh = Object.entries(vulnerabilities).filter(
  ([name, entry]) => failingSeverities.has(entry.severity) && excused(name)
);

for (const [name, entry] of excusedHigh) {
  console.log(`Excepted: ${name} (${entry.severity})`);
}
for (const exception of active.values()) {
  console.log(`  ${exception.advisory}: ${exception.reason} Expires ${exception.expires}.`);
}
if (failures.length > 0) {
  console.error(`\n${failures.length} high or critical vulnerabilities without an exception:`);
  for (const [name, entry] of failures) {
    console.error(`  ${name} (${entry.severity}) ${entry.range}`);
  }
  process.exit(1);
}
console.log('npm audit: no high or critical vulnerabilities outside the exceptions.');
