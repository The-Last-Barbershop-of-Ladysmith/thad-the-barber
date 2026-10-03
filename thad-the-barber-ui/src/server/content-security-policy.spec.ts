import { environment } from '../environments/environment.test';
import {
  applyNonce,
  contentSecurityPolicy,
  createNonce,
  styleAttributeHashes,
} from './content-security-policy';

describe(
  'content security policy',
  (): void => {
    function directive(policy: string, name: string): string[] {
      const found: string | undefined = policy.split('; ').find((part: string): boolean => part.startsWith(`${name} `));
      return found?.split(' ').slice(1) ?? [];
    }

    it(
      'creates a different 128-bit nonce each time',
      (): void => {
        const nonces: Set<string> = new Set(Array.from({ length: 50 }, createNonce));

        expect(nonces.size).toBe(50);
        nonces.forEach((nonce: string): void => {
          expect(atob(nonce)).toHaveLength(16);
        });
      },
    );

    it(
      'fills every nonce placeholder, including ngCspNonce',
      (): void => {
        const html: string = '<app-root ngcspnonce="CSP_NONCE"></app-root><script nonce="CSP_NONCE"></script><p>CSP_NONCE</p>';

        expect(applyNonce(html, 'abc')).toBe('<app-root ngcspnonce="abc"></app-root><script nonce="abc"></script><p>CSP_NONCE</p>');
      },
    );

    it(
      "nonces the dev server's live-reload client and tells it the nonce",
      (): void => {
        const html: string = applyNonce('<script type="module" src="/@vite/client"></script>', 'abc');

        expect(html).toBe('<meta property="csp-nonce" nonce="abc"><script type="module" src="/@vite/client" nonce="abc"></script>');
      },
    );

    it(
      'allows scripts and styles only by nonce',
      (): void => {
        const policy: string = contentSecurityPolicy('abc', environment);

        expect(directive(policy, 'script-src')).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
        expect(directive(policy, 'style-src')).toEqual(["'self'", "'nonce-abc'"]);
        expect(policy).not.toContain('unsafe-inline');
        expect(policy).not.toContain('unsafe-eval');
      },
    );

    it(
      'connects to the API and the App Insights ingestion endpoint from the environment',
      (): void => {
        const connect: string[] = directive(contentSecurityPolicy('abc', environment), 'connect-src');

        expect(connect).toContain(new URL(environment.apiBaseUrl).origin);
        expect(connect).toContain('https://centralus-2.in.applicationinsights.azure.com');
      },
    );

    it(
      'leaves out App Insights when there is no connection string',
      (): void => {
        const connect: string[] = directive(contentSecurityPolicy('abc', { ...environment, appInsightsConnectionString: '' }), 'connect-src');

        expect(connect.some((source: string): boolean => source.includes('applicationinsights'))).toBe(false);
      },
    );

    it(
      'loads images from the media host',
      (): void => {
        expect(directive(contentSecurityPolicy('abc', environment), 'img-src')).toContain(new URL(environment.mediaBaseUrl).origin);
      },
    );

    it(
      'blocks framing, plugins and base or form hijacking',
      (): void => {
        const policy: string = contentSecurityPolicy('abc', environment);

        expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
        expect(directive(policy, 'object-src')).toEqual(["'none'"]);
        expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
        expect(directive(policy, 'form-action')).toEqual(["'self'"]);
      },
    );

    it(
      'allows style attributes only when the page has them, by hash',
      (): void => {
        const hashes: string[] = styleAttributeHashes('<div style="color: red"></div><p style="color: red"></p>');

        // sha256 of "color: red", base64
        expect(hashes).toEqual(["'sha256-NerDAUWfwD31YdZHveMrq0GLjsNFMwxLpZl0dPUeCcw='"]);
        expect(directive(contentSecurityPolicy(
          'abc',
          environment,
          hashes,
        ), 'style-src-attr')).toEqual(["'unsafe-hashes'", ...hashes]);
        expect(directive(contentSecurityPolicy('abc', environment), 'style-src-attr')).toEqual([]);
      },
    );

    it(
      'hashes style attributes as the browser reads them, after entity decoding',
      (): void => {
        // sha256 of 'content: "a"', base64
        expect(styleAttributeHashes('<i style="content: &quot;a&quot;"></i>')).toEqual(["'sha256-zjXjT0SWbrdip2Jv1iDlKGPfvI5lRNm7iSoS9kdyvoA='"]);
      },
    );
  },
);
