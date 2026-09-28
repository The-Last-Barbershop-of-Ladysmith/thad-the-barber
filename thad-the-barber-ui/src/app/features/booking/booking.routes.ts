import { type Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import * as bookingEffects from './state/booking.effects';
import { bookingFeature } from './state/booking.feature';
import type { Booking } from './booking';

/** The booking slice and effects register only when this route loads. */
export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    title: 'Book an appointment · Thad The Barber',
    providers: [
      provideState(bookingFeature),
      provideEffects(bookingEffects),
    ],
    loadComponent: (): Promise<typeof Booking> =>
      import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
  },
];
