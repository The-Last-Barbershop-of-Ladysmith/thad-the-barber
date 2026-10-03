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

interface FileReplacement {
  replace: string;
  with: string;
}

interface BuildConfiguration {
  fileReplacements?: FileReplacement[];
  outputPath?: { base: string; };
}

interface AngularProject { architect: { build: { configurations: Record<string, BuildConfiguration>; }; }; }

interface AngularJson { projects: Record<string, AngularProject>; }

/**
 * Writes the environment-specific CSP sources to csp-sources.json in the `express` configuration's output folder,
 * for Express's Content-Security-Policy. Runs after each `build:express:*` script:
 * `node scripts/write-csp-sources.ts <configuration>`.
 * The environment file is the one angular.json swaps in for that configuration, so the origins live in one place.
 */
const ENVIRONMENT_FILE: string = 'src/environments/environment.ts';

const configuration: string | undefined = process.argv[2];
if (!configuration) {
  throw new Error('Usage: node scripts/write-csp-sources.ts <configuration>');
}

const angularJson: AngularJson = JSON.parse(readFileSync('angular.json', 'utf8')) as AngularJson;
const configurations: Record<string, BuildConfiguration> | undefined = angularJson.projects['thad-the-barber-ui']?.architect.build.configurations;
const outDir: string | undefined = configurations?.['express']?.outputPath?.base;
if (!outDir) {
  throw new Error('angular.json has no express configuration with an outputPath');
}
const environmentFile: string = configurations?.[configuration]?.fileReplacements
  ?.find((replacement: FileReplacement): boolean => replacement.replace === ENVIRONMENT_FILE)?.with ?? ENVIRONMENT_FILE;

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
