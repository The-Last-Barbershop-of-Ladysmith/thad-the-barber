import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import * as bookingEffects from './state/booking.effects';
import { Booking } from './booking';

/** The booking effects register when this route loads; the slice is a root reducer (`app.config.ts`). */
export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    title: 'Book an appointment · Thad The Barber',
    providers: [provideEffects(bookingEffects)],
    loadComponent: (): Promise<typeof Booking> =>
      import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
  },
];
