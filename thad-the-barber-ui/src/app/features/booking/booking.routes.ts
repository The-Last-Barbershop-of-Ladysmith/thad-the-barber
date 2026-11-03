import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import * as bookingEffects from './state/booking.effects';
import { Booking } from './booking';
import { leaveBookingGuard } from './guards/leave-booking.guard';
import { bookingFeature } from './state/booking.feature';
import * as manageBooking from './pages/manage-booking/manage-booking';

// The booking slice and effects register once for /book and the manage pages; a reschedule opens the booking page.
export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    // The leave guard and the booking page's dialog share this ConfirmationService.
    providers: [
      provideState(bookingFeature),
      provideEffects(bookingEffects),
      ConfirmationService,
    ],
    children: [
      {
        path: '',
        title: 'Book an appointment · Thad The Barber',
        canDeactivate: [leaveBookingGuard],
        loadComponent: (): Promise<typeof Booking> =>
          import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
      },
      {
        path: 'manage/:id/reschedule',
        title: 'Reschedule · Thad The Barber',
        canDeactivate: [leaveBookingGuard],
        loadComponent: (): Promise<typeof Booking> =>
          import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
      },
      {
        path: 'manage/:id',
        title: 'Your appointment · Thad The Barber',
        loadComponent: (): Promise<typeof manageBooking.ManageBooking> =>
          import('./pages/manage-booking/manage-booking').then(
            (m: typeof manageBooking): typeof manageBooking.ManageBooking => m.ManageBooking,
          ),
      },
    ],
  },
];
