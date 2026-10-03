import { Routes } from '@angular/router';
import * as bookingRoutes from './features/booking/booking.routes';
import { HOME_ROUTES } from './features/home/home.routes';
import * as notFound from './pages/not-found/not-found';

/**
 * Home is the prerendered landing page, so its code ships with the app instead of a second download before a click
 * can navigate. Other features lazy-load. Each feature's routes register its store slice.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Thad The Barber · Fredericksburg, VA',
    children: HOME_ROUTES,
  },
  {
    path: 'book',
    loadChildren: (): Promise<Routes> =>
      import('./features/booking/booking.routes').then((m: typeof bookingRoutes): Routes => m.BOOKING_ROUTES),
  },
  {
    path: '404',
    title: 'Page not found · Thad The Barber',
    loadComponent: (): Promise<typeof notFound.NotFound> =>
      import('./pages/not-found/not-found').then((m: typeof notFound): typeof notFound.NotFound => m.NotFound),
  },
  {
    path: '**',
    title: 'Page not found · Thad The Barber',
    loadComponent: (): Promise<typeof notFound.NotFound> =>
      import('./pages/not-found/not-found').then((m: typeof notFound): typeof notFound.NotFound => m.NotFound),
  },
];
