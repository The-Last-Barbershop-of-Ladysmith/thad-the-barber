import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
  NodeRequestHandlerFunction,
} from '@angular/ssr/node';
import express, {
  Express,
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { join } from 'node:path';

const browserDistFolder: string = join(import.meta.dirname, '../browser');

const app: Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(express.static(
  browserDistFolder,
  {
    maxAge: '1y',
    index: false,
    redirect: false,
  },
));

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
): void => {
  angularApp
    .handle(req)
    .then(async (response: Response | null): Promise<void> => {
      if (response) {
        await writeResponseToNodeResponse(response, res);
        return;
      }
      next();
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port: string | number = process.env['PORT'] ?? 4000;
  app.listen(
    port,
    (error?: Error): void => {
      if (error) {
        throw error;
      }

      // eslint-disable-next-line no-console -- startup message for local SSR runs
      console.log(`Node Express server listening on http://localhost:${port}`);
    },
  );
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler: NodeRequestHandlerFunction = createNodeRequestHandler(app);
