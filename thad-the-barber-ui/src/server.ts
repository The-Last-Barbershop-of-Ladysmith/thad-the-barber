import {
  AngularNodeAppEngine,
  NodeRequestHandlerFunction,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { IncomingMessage, ServerResponse } from 'node:http';
import { environment } from './environments/environment';
import {
  applyNonce,
  contentSecurityPolicy,
  createNonce,
  styleAttributeHashes,
} from './server/content-security-policy';

const siteHost: string = new URL(environment.siteUrl).hostname;

/**
 * Production trusts only its own host. The other builds also allow localhost, because CI serves the test build there
 * for e2e and Lighthouse.
 */
const allowedHosts: string[] = environment.production ? [siteHost] : ['localhost', siteHost];

const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine({ allowedHosts });

/** CSP_REPORT_ONLY=true (an App Service setting) reports violations without blocking, to roll out a policy. */
const cspHeader: string = process.env['CSP_REPORT_ONLY'] === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

/**
 * Every page, prerendered or not, carries the build's `CSP_NONCE` placeholder. Each response gets a fresh nonce in the
 * HTML and the matching header, and is never reused from a cache, which would replay an old nonce.
 */
async function withNonce(response: Response): Promise<Response> {
  const nonce: string = createNonce();
  const html: string = await response.text();
  const headers: Headers = new Headers(response.headers);
  headers.set(cspHeader, contentSecurityPolicy(
    nonce,
    environment,
    styleAttributeHashes(html),
  ));
  headers.set('Cache-Control', 'no-cache');
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(applyNonce(html, nonce), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Express (thad-the-barber-express) mounts this for every page request, and `ng serve` uses it too. The engine serves
 * prerendered pages and the client shell, and server-renders the rest with the status they set (404s too).
 */
export const reqHandler: NodeRequestHandlerFunction = createNodeRequestHandler(async (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
): Promise<void> => {
  try {
    const response: Response | null = await angularApp.handle(req);
    if (!response) {
      next();
      return;
    }
    const isHtml: boolean = response.headers.get('Content-Type')?.startsWith('text/html') ?? false;
    await writeResponseToNodeResponse(isHtml ? await withNonce(response) : response, res);
  } catch (error: unknown) {
    next(error);
  }
});
