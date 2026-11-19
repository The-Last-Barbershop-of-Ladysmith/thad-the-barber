import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The routes rendered only in the browser. The build writes them to Express's `client-routes.json`
 * (`scripts/write-express-files.ts`), so Express serves the app shell for them and its 404 page for any other unknown
 * path. A `:param` stands for any one path segment. The admin area is here too: it needs the browser for Google's
 * sign-in and is never indexed (the server sends it `noindex` as well).
 */
export const CLIENT_ROUTES: string[] = [
  'book/manage',
  'book/manage/:id',
  'book/manage/:id/reschedule',
  'admin',
  'admin/overview',
  'admin/announcements',
  'admin/announcements/new',
  'admin/announcements/text',
  'admin/announcements/:index',
  'admin/shop',
  'admin/gallery',
];

/** The routes search engines should find; the build writes them to the sitemap (`scripts/write-express-files.ts`). */
export const INDEXED_ROUTES: string[] = [
  '',
  'book',
  'privacy',
  'terms',
  'text-updates',
  'accessibility',
  'contact',
];

/**
 * Express serves each prerendered page as a file, the app shell for `CLIENT_ROUTES`, and the prerendered /404 page with
 * a 404 status for any other path (thad-the-barber-express/routes/index.js).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'text-updates', renderMode: RenderMode.Prerender },
  { path: 'accessibility', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'book', renderMode: RenderMode.Prerender },
  { path: '404', renderMode: RenderMode.Prerender },
  ...CLIENT_ROUTES.map((path: string): ServerRoute => ({ path, renderMode: RenderMode.Client })),
  { path: '**', renderMode: RenderMode.Client },
];
