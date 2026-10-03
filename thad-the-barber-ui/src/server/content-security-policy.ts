import { createHash, randomBytes } from 'node:crypto';
import { Environment } from '../environments/environment.model';

const NONCE_PLACEHOLDER: RegExp = /(nonce=")CSP_NONCE(")/gi;
const STYLE_ATTRIBUTE: RegExp = /\sstyle="([^"]*)"/g;
const NONCE_BYTES: number = 16;
const VITE_CLIENT: string = '<script type="module" src="/@vite/client">';

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('base64');
}

/**
 * Fills the build's `CSP_NONCE` placeholder in `ngCspNonce` and every `nonce` attribute. Under `ng serve`, Vite's
 * live-reload client gets the nonce too, plus the `csp-nonce` meta tag it reads for the styles it injects.
 */
export function applyNonce(html: string, nonce: string): string {
  return html
    .replace(NONCE_PLACEHOLDER, `$1${nonce}$2`)
    .replace(VITE_CLIENT, `<meta property="csp-nonce" nonce="${nonce}"><script type="module" src="/@vite/client" nonce="${nonce}">`);
}

/**
 * Rendered HTML carries `style` attributes from component bindings (PrimeNG's carousel). A nonce can't cover
 * attributes, so the policy allows exactly these values by hash until Angular takes over and sets styles from script.
 */
export function styleAttributeHashes(html: string): string[] {
  const values: Set<string> = new Set(Array.from(
    html.matchAll(STYLE_ATTRIBUTE),
    (match: RegExpMatchArray): string => (match[1] ?? '').replace(/&(amp|quot|#39|lt|gt);/g, (entity: string): string => HTML_ENTITIES[entity] ?? entity),
  ));
  return Array.from(values, (value: string): string => `'sha256-${createHash('sha256').update(value).digest('base64')}'`);
}

function ingestionOrigin(connectionString: string): string[] {
  const endpoint: string | undefined = /IngestionEndpoint=([^;]+)/.exec(connectionString)?.[1];
  return endpoint ? [new URL(endpoint).origin] : [];
}

export function contentSecurityPolicy(
  nonce: string,
  environment: Environment,
  styleHashes: string[] = [],
): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [`'nonce-${nonce}'`, "'strict-dynamic'"],
    'style-src': ["'self'", `'nonce-${nonce}'`],
    ...(styleHashes.length > 0 ? { 'style-src-attr': ["'unsafe-hashes'", ...styleHashes] } : {}),
    'img-src': [
      "'self'",
      'data:',
      new URL(environment.mediaBaseUrl).origin,
    ],
    'connect-src': [
      "'self'",
      new URL(environment.apiBaseUrl).origin,
      ...ingestionOrigin(environment.appInsightsConnectionString),
      'https://www.google.com/recaptcha/',
    ],
    'frame-src': [
      'https://maps.google.com/maps',
      'https://www.google.com/maps/',
      'https://www.google.com/recaptcha/',
      'https://recaptcha.google.com/recaptcha/',
    ],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(directives).map(([name, sources]: [string, string[]]): string => `${name} ${sources.join(' ')}`).join('; ');
}
