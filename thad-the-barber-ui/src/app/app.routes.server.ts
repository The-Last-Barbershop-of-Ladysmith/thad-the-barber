import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Express serves each prerendered page as a file and answers any other path with the prerendered /404 page and a 404
 * status (thad-the-barber-express/routes/index.js). Client-rendered routes are listed there too.
 * #58: once the date step waits for availability, prerender /book and drop it from Express's client route list.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
