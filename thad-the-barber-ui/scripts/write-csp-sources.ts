import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/** The environment fields the CSP needs. Node runs this file unbuilt, so it can't import `Environment`. */
interface CspEnvironment {
  apiBaseUrl: string;
  mediaBaseUrl: string;
  appInsightsConnectionString: string;
}

interface BuildConfiguration { fileReplacements?: { with: string; }[]; }

interface AngularProject { architect: { build: { configurations: Record<string, BuildConfiguration>; }; }; }

/**
 * Writes the environment-specific CSP sources to `<outDir>/csp-sources.json` for Express's Content-Security-Policy.
 * Runs after each `build:express:*` script: `node scripts/write-csp-sources.ts <configuration> <outDir>`.
 * The environment file is the one angular.json swaps in for that configuration, so the origins live in one place.
 */
const configuration: string | undefined = process.argv[2];
const outDir: string | undefined = process.argv[3];
if (!configuration || !outDir) {
  throw new Error('Usage: node scripts/write-csp-sources.ts <configuration> <outDir>');
}

const projects: Record<string, AngularProject> = (JSON.parse(readFileSync('angular.json', 'utf8')) as { projects: Record<string, AngularProject>; }).projects;
const build: BuildConfiguration | undefined = Object.values(projects)[0]?.architect.build.configurations[configuration];
const environmentFile: string = build?.fileReplacements?.[0]?.with ?? 'src/environments/environment.ts';

// Transpiling drops the type-only `Environment` import, which Node couldn't resolve.
const javascript: string = ts.transpileModule(readFileSync(environmentFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const module: { environment: CspEnvironment; } = await import(`data:text/javascript,${encodeURIComponent(javascript)}`) as { environment: CspEnvironment; };
const environment: CspEnvironment = module.environment;

const ingestionEndpoint: string | undefined = /IngestionEndpoint=([^;]+)/.exec(environment.appInsightsConnectionString)?.[1];
const sources: Record<string, string[]> = {
  'connect-src': [new URL(environment.apiBaseUrl).origin, ...(ingestionEndpoint ? [new URL(ingestionEndpoint).origin] : [])],
  'img-src': [new URL(environment.mediaBaseUrl).origin],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'csp-sources.json'), `${JSON.stringify(
  sources,
  null,
  2,
)}\n`);
process.stdout.write(`Wrote csp-sources.json from ${environmentFile}\n`);
