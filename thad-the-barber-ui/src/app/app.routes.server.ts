import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Only the home page is prerendered for now. /book can be once its date step waits for availability (#58);
 * until then a prerendered calendar lets visitors pick a day before booked days load.
 */
export const serverRoutes: ServerRoute[] = [{ path: '', renderMode: RenderMode.Prerender }, { path: '**', renderMode: RenderMode.Client }];
