import { Routes } from '@angular/router';
import * as bookingRoutes from './features/booking/booking.routes';
import * as homeRoutes from './features/home/home.routes';

/** Each feature lazy-loads its own routes, which also register that feature's store slice. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Thad The Barber · Fredericksburg, VA',
    loadChildren: (): Promise<Routes> =>
      import('./features/home/home.routes').then((m: typeof homeRoutes): Routes => m.HOME_ROUTES),
  },
  {
    path: 'book',
    loadChildren: (): Promise<Routes> =>
      import('./features/booking/booking.routes').then((m: typeof bookingRoutes): Routes => m.BOOKING_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
