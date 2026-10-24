import { build } from 'esbuild';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/** The environment fields the CSP needs. Node runs this file unbuilt, so it can't import `Environment`. */
interface CspEnvironment {
  apiBaseUrl: string;
  mediaBaseUrl: string;
  appInsightsConnectionString: string;
}

interface EnvironmentModule { environment: CspEnvironment; }

interface BrandCssModule { brandCss: () => string; }

/** The shop facts the error page shows. Node runs this file unbuilt, so it can't import the app's models. */
interface ErrorPageShop {
  name: string;
  phone: {
    display: string; tel: string; sms: string;
  };
  bookingUrl: string;
}

interface ShopFallback {
  name: string;
  phone: string;
  squareBookingSiteUrl: string;
}

interface ShopInfoModule { SHOP_FALLBACK: ShopFallback; }

interface PhoneUtilsModule { toPhoneLinks: (e164: string) => ErrorPageShop['phone']; }

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
 * Writes the files Express needs next to the build in the `express` configuration's output folder. Runs after each
 * `build:express:*` script: `node scripts/write-express-files.ts <configuration>`.
 * - csp-sources.json: the environment's origins for Express's Content-Security-Policy, from the environment file
 *   angular.json swaps in for that configuration, so the origins live in one place.
 * - brand.css: the theme's CSS variables for the error pages (src/app/theme/brand-css.ts).
 * - shop.json: the shop name, phone and Square booking URL for the error page, from src/app/core/config/shop-info.ts.
 */
const ENVIRONMENT_FILE: string = 'src/environments/environment.ts';

const configuration: string | undefined = process.argv[2];
if (!configuration) {
  throw new Error('Usage: node scripts/write-express-files.ts <configuration>');
}

const angularJson: AngularJson = JSON.parse(readFileSync('angular.json', 'utf8')) as AngularJson;
const configurations: Record<string, BuildConfiguration> | undefined = angularJson.projects['thad-the-barber-ui']?.architect.build.configurations;
const outDir: string | undefined = configurations?.['express']?.outputPath?.base;
if (!outDir) {
  throw new Error('angular.json has no express configuration with an outputPath');
}
const environmentFile: string = configurations?.[configuration]?.fileReplacements
  ?.find((replacement: FileReplacement): boolean => replacement.replace === ENVIRONMENT_FILE)?.with ?? ENVIRONMENT_FILE;

/** Bundles a TypeScript module from src (Node can't resolve its extensionless imports) and imports it. */
async function importSource<T>(file: string): Promise<T> {
  const bundle: Awaited<ReturnType<typeof build>> = await build({
    entryPoints: [file],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  const javascript: string = bundle.outputFiles?.[0]?.text ?? '';
  return await import(`data:text/javascript,${encodeURIComponent(javascript)}`) as T;
}

const environmentModule: Promise<EnvironmentModule> = importSource(environmentFile);
const brandCssModule: Promise<BrandCssModule> = importSource('src/app/theme/brand-css.ts');
const shopInfoModule: Promise<ShopInfoModule> = importSource('src/app/core/config/shop-info.ts');
const phoneUtilsModule: Promise<PhoneUtilsModule> = importSource('src/app/shared/utils/phone.utils.ts');
const { environment }: EnvironmentModule = await environmentModule;
const { brandCss }: BrandCssModule = await brandCssModule;
const { SHOP_FALLBACK }: ShopInfoModule = await shopInfoModule;
const { toPhoneLinks }: PhoneUtilsModule = await phoneUtilsModule;
const shop: ErrorPageShop = {
  name: SHOP_FALLBACK.name,
  phone: toPhoneLinks(SHOP_FALLBACK.phone),
  bookingUrl: SHOP_FALLBACK.squareBookingSiteUrl,
};

const ingestionEndpoint: string | undefined = /IngestionEndpoint=([^;]+)/.exec(environment.appInsightsConnectionString)?.[1];
const mediaOrigin: string = new URL(environment.mediaBaseUrl).origin;
const sources: Record<string, string[]> = {
  'connect-src': [
    new URL(environment.apiBaseUrl).origin,
    mediaOrigin,
    ...(ingestionEndpoint ? [new URL(ingestionEndpoint).origin] : []),
  ],
  'img-src': [mediaOrigin],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'csp-sources.json'), `${JSON.stringify(
  sources,
  null,
  2,
)}\n`);
writeFileSync(join(outDir, 'brand.css'), brandCss());
writeFileSync(join(outDir, 'shop.json'), `${JSON.stringify(
  shop,
  null,
  2,
)}\n`);
process.stdout.write(`Wrote csp-sources.json from ${environmentFile}, brand.css and shop.json to ${outDir}\n`);
