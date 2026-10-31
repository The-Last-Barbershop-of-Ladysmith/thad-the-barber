import { RenderMode, ServerRoute } from '@angular/ssr';
import { CLIENT_ROUTES } from './core/config/client-routes';

/**
 * Express serves each prerendered page as a file, the app shell for the client routes (`CLIENT_ROUTES`, which the build
 * writes to its `client-routes.json`), and the prerendered /404 page with a 404 status for any other path
 * (thad-the-barber-express/routes/index.js).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },
  ...CLIENT_ROUTES.map((path: string): ServerRoute => ({ path, renderMode: RenderMode.Client })),
  { path: '**', renderMode: RenderMode.Client },
];
