import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { ConfirmationService } from 'primeng/api';
import * as bookingEffects from './state/booking.effects';
import { Booking } from './booking';
import { leaveBookingGuard } from './guards/leave-booking.guard';
import * as manageBooking from './pages/manage-booking/manage-booking';
import * as manageBookings from './pages/manage-bookings/manage-bookings';

/**
 * The booking effects register once for /book and its manage pages; a booking's reschedule opens the booking page to
 * move it. The slice is a root reducer (`app.config.ts`).
 */
export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    // The leave guard and the booking page's dialog share this ConfirmationService.
    providers: [provideEffects(bookingEffects), ConfirmationService],
    children: [
      {
        path: '',
        title: 'Book an appointment · Thad The Barber',
        canDeactivate: [leaveBookingGuard],
        loadComponent: (): Promise<typeof Booking> =>
          import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
      },
      {
        path: 'manage',
        title: 'Your bookings · Thad The Barber',
        loadComponent: (): Promise<typeof manageBookings.ManageBookings> =>
          import('./pages/manage-bookings/manage-bookings').then(
            (m: typeof manageBookings): typeof manageBookings.ManageBookings => m.ManageBookings,
          ),
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
