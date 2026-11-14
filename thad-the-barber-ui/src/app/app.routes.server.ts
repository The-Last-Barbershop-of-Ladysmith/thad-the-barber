import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The routes rendered only in the browser. The build writes them to Express's `client-routes.json`
 * (`scripts/write-express-files.ts`), so Express serves the app shell for them and its 404 page for any other unknown
 * path. A `:param` stands for any one path segment.
 * #58: once /book is prerendered, remove it here.
 */
export const CLIENT_ROUTES: string[] = [
  'book',
  'book/find',
  'book/manage/:id',
  'book/manage/:id/reschedule',
];

/**
 * Express serves each prerendered page as a file, the app shell for `CLIENT_ROUTES`, and the prerendered /404 page with
 * a 404 status for any other path (thad-the-barber-express/routes/index.js).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },
  ...CLIENT_ROUTES.map((path: string): ServerRoute => ({ path, renderMode: RenderMode.Client })),
  { path: '**', renderMode: RenderMode.Client },
];
