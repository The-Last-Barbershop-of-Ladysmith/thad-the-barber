import {
  AngularNodeAppEngine,
  NodeRequestHandlerFunction,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { IncomingMessage, ServerResponse } from 'node:http';
import { environment } from './environments/environment';

const siteHost: string = new URL(environment.siteUrl).hostname;

/**
 * Production trusts only its own host. The other builds also allow localhost, because CI serves the test build there
 * for e2e and Lighthouse.
 */
const allowedHosts: string[] = environment.production ? [siteHost] : ['localhost', siteHost];

const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine({ allowedHosts });

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
    if (response) {
      await writeResponseToNodeResponse(response, res);
      return;
    }
    next();
  } catch (error: unknown) {
    next(error);
  }
});
