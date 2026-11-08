import { build } from 'esbuild';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The environment fields the CSP needs. Node runs this file unbuilt, so it can't import `Environment`. */
interface CspEnvironment {
  apiBaseUrl: string;
  mediaBaseUrl: string;
  appInsightsConnectionString: string;
}

interface EnvironmentModule { environment: CspEnvironment; }

interface BrandCssModule { brandCss: () => string; }

/** The phone links the error page shows. Node runs this file unbuilt, so it can't import the app's models. */
interface PhoneLinks {
  display: string;
  tel: string;
  sms: string;
}

/** The shop facts the error page shows (Express's `shop.json`). */
interface ErrorPageShop {
  name: string;
  phone: PhoneLinks;
  bookingUrl: string;
}

/** The fields of the app's `SHOP_FALLBACK` this script reads. */
interface ShopFallback {
  name: string;
  phone: string;
  squareBookingSiteUrl: string;
}

interface ShopInfoModule { SHOP_FALLBACK: ShopFallback; }

interface PhoneUtilsModule { toPhoneLinks: (e164: string) => PhoneLinks; }

interface ClientRoutesModule { CLIENT_ROUTES: string[]; }

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
 * - fonts.css: the @font-face rules of the app's display and body fonts, copied from the built stylesheet (its file
 *   name is hashed) so the error pages load the same files from /media.
 * - font-preloads.json: the Latin files of those fonts and PrimeIcons' woff2, which Express preloads on each page.
 * - shop.json: the shop name, phone and Square booking URL for the error page, from src/app/core/config/shop-info.ts.
 * - client-routes.json: the routes Express serves the app shell for, from src/app/app.routes.server.ts.
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
const clientRoutesModule: Promise<ClientRoutesModule> = importSource('src/app/app.routes.server.ts');
const { environment }: EnvironmentModule = await environmentModule;
const { brandCss }: BrandCssModule = await brandCssModule;
const { SHOP_FALLBACK }: ShopInfoModule = await shopInfoModule;
const { toPhoneLinks }: PhoneUtilsModule = await phoneUtilsModule;
const { CLIENT_ROUTES }: ClientRoutesModule = await clientRoutesModule;
const shop: ErrorPageShop = {
  name: SHOP_FALLBACK.name,
  phone: toPhoneLinks(SHOP_FALLBACK.phone),
  bookingUrl: SHOP_FALLBACK.squareBookingSiteUrl,
};

const FONT_RULE_FAMILY: RegExp = /font-family:\s*["']?(?:Syne|Plus Jakarta Sans) Variable/;
const stylesheetName: string | undefined = readdirSync(outDir).find((name: string): boolean => /^styles(-.*)?\.css$/.test(name));
if (!stylesheetName) {
  throw new Error(`${outDir} has no built stylesheet to take the font rules from`);
}
const fontRules: string[] = (readFileSync(join(outDir, stylesheetName), 'utf8').match(/@font-face\s*\{[^}]*\}/g) ?? [])
  .filter((rule: string): boolean => FONT_RULE_FAMILY.test(rule));
if (fontRules.length === 0) {
  throw new Error(`${stylesheetName} has no @font-face rules for the Syne or Plus Jakarta Sans fonts`);
}

const LATIN_RANGE: RegExp = /unicode-range:\s*U\+0000-00FF/;
const FONT_FILE: RegExp = /url\("?\.?(\/media\/[^")]+\.woff2)"?\)/;
const fontPreloads: string[] = fontRules
  .filter((rule: string): boolean => LATIN_RANGE.test(rule))
  .map((rule: string): string => {
    const fontFile: string | undefined = FONT_FILE.exec(rule)?.[1];
    if (!fontFile) {
      throw new Error(`The Latin font rule has no woff2 file: ${rule}`);
    }
    return fontFile;
  });
const iconFontName: string | undefined = readdirSync(join(outDir, 'media'))
  .find((name: string): boolean => /^primeicons(-.*)?\.woff2$/.test(name));
if (fontPreloads.length === 0 || !iconFontName) {
  throw new Error(`${outDir} has no Latin font file or PrimeIcons woff2 to preload`);
}
fontPreloads.push(`/media/${iconFontName}`);

const ingestionEndpoint: string | undefined = /IngestionEndpoint=([^;]+)/.exec(environment.appInsightsConnectionString)?.[1];
const mediaOrigin: string = new URL(environment.mediaBaseUrl).origin;
const sources: Record<string, string[]> = {
  'connect-src': [
    new URL(environment.apiBaseUrl).origin,
    mediaOrigin,
    ...(ingestionEndpoint ? [new URL(ingestionEndpoint).origin] : []),
  ],
  'img-src': [
    mediaOrigin,
    'https://maps.googleapis.com',
  ],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'csp-sources.json'), `${JSON.stringify(
  sources,
  null,
  2,
)}\n`);
writeFileSync(join(outDir, 'brand.css'), brandCss());
writeFileSync(join(outDir, 'fonts.css'), `${fontRules.join('\n')}\n`);
writeFileSync(join(outDir, 'font-preloads.json'), `${JSON.stringify(
  fontPreloads,
  null,
  2,
)}\n`);
writeFileSync(join(outDir, 'shop.json'), `${JSON.stringify(
  shop,
  null,
  2,
)}\n`);
writeFileSync(join(outDir, 'client-routes.json'), `${JSON.stringify(
  CLIENT_ROUTES,
  null,
  2,
)}\n`);
process.stdout.write(
  `Wrote csp-sources.json from ${environmentFile}, brand.css, fonts.css, font-preloads.json, shop.json and client-routes.json to ${outDir}\n`,
);
