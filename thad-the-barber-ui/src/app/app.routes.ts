import { Route, Routes } from '@angular/router';
import * as bookingRoutes from './features/booking/booking.routes';
import { HOME_ROUTES } from './features/home/home.routes';
import { RouteSeo } from './shared/models/route-seo.model';
import * as accessibility from './pages/accessibility/accessibility';
import * as notFound from './pages/not-found/not-found';
import * as privacy from './pages/privacy/privacy';

const homeSeo: RouteSeo = {
  title: '{shopName} · Barber in {city}',
  description: '{shopName} gives fresh, tailored cuts for the whole family in {city}. '
    + 'Check open times and hours, then book your cut online in under a minute.',
  isIndexed: true,
};

const privacySeo: RouteSeo = {
  title: 'Privacy policy · {shopName}',
  description: 'What {shopName} collects when you book online or visit the site, '
    + 'how your name and phone number are used, and how long they are kept.',
  isIndexed: true,
};

const accessibilitySeo: RouteSeo = {
  title: 'Accessibility · {shopName}',
  description: 'How {shopName} works to keep this website usable for everyone, '
    + 'the standard we aim for, and how to tell us about a problem you run into.',
  isIndexed: true,
};

const notFoundSeo: RouteSeo = {
  title: 'Page not found · {shopName}',
  description: 'That page is not here. Head back to the {shopName} home page, '
    + 'book a cut online in under a minute, or book on Square instead.',
  isIndexed: false,
};

const notFoundRoute: Route = {
  data: { seo: notFoundSeo },
  loadComponent: (): Promise<typeof notFound.NotFound> =>
    import('./pages/not-found/not-found').then((m: typeof notFound): typeof notFound.NotFound => m.NotFound),
};

/**
 * Home is the prerendered landing page, so its code ships with the app instead of a second download before a click
 * can navigate. Other features lazy-load. Each feature's routes register its store slice.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { seo: homeSeo },
    children: HOME_ROUTES,
  },
  {
    path: 'book',
    loadChildren: (): Promise<Routes> =>
      import('./features/booking/booking.routes').then((m: typeof bookingRoutes): Routes => m.BOOKING_ROUTES),
  },
  {
    path: 'privacy',
    data: { seo: privacySeo },
    loadComponent: (): Promise<typeof privacy.Privacy> =>
      import('./pages/privacy/privacy').then((m: typeof privacy): typeof privacy.Privacy => m.Privacy),
  },
  {
    path: 'accessibility',
    data: { seo: accessibilitySeo },
    loadComponent: (): Promise<typeof accessibility.Accessibility> =>
      import('./pages/accessibility/accessibility')
        .then((m: typeof accessibility): typeof accessibility.Accessibility => m.Accessibility),
  },
  { path: '404', ...notFoundRoute },
  { path: '**', ...notFoundRoute },
];
