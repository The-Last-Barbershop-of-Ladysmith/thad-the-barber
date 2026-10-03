import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Home is prerendered. /book stays client-rendered until its date step waits for availability (#58); until then a
 * rendered calendar lets visitors pick a day before booked days load. Everything else renders on the server, so an
 * unknown URL reaches the not-found page there and it can answer with a 404.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'book', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
