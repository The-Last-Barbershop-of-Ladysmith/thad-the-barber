import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { RouteSeo } from '../../shared/models/route-seo.model';
import * as bookingEffects from './state/booking.effects';
import { Booking } from './booking';
import { leaveBookingGuard } from './guards/leave-booking.guard';
import { bookingFeature } from './state/booking.feature';
import { FindBookings } from './pages/find-bookings/find-bookings';
import { ManageBooking } from './pages/manage-booking/manage-booking';

const bookSeo: RouteSeo = {
  title: 'Book an appointment · {shopName}',
  description: 'Pick a time and book your cut online with {shopName} in under a minute. '
    + 'Choose a day, enter your name and phone, and get a confirmation.',
  isIndexed: true,
};

const findBookingsSeo: RouteSeo = {
  title: 'Find my bookings · {shopName}',
  description: 'Look up your upcoming appointments with {shopName} using the text code we send to your phone, '
    + 'then change or cancel them.',
  isIndexed: false,
};

const rescheduleSeo: RouteSeo = {
  title: 'Reschedule · {shopName}',
  description: 'Pick a new day and time for your existing appointment with {shopName}, '
    + 'then confirm the change from this page to move your booking.',
  isIndexed: false,
};

const manageSeo: RouteSeo = {
  title: 'Your appointment · {shopName}',
  description: 'See your appointment with {shopName}, add it to your calendar, '
    + 'reschedule it or cancel it from this page. Everything you need to change a booking is here.',
  isIndexed: false,
};

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
        data: { seo: bookSeo },
        canDeactivate: [leaveBookingGuard],
        loadComponent: (): Promise<typeof Booking> =>
          import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
      },
      {
        path: 'manage',
        data: { seo: findBookingsSeo },
        loadComponent: (): Promise<typeof FindBookings> =>
          import('./pages/find-bookings/find-bookings')
            .then((m: { FindBookings: typeof FindBookings; }): typeof FindBookings => m.FindBookings),
      },
      {
        path: 'manage/:id/reschedule',
        data: { seo: rescheduleSeo },
        canDeactivate: [leaveBookingGuard],
        loadComponent: (): Promise<typeof Booking> =>
          import('./booking').then((m: { Booking: typeof Booking; }): typeof Booking => m.Booking),
      },
      {
        path: 'manage/:id',
        data: { seo: manageSeo },
        loadComponent: (): Promise<typeof ManageBooking> =>
          import('./pages/manage-booking/manage-booking')
            .then((m: { ManageBooking: typeof ManageBooking; }): typeof ManageBooking => m.ManageBooking),
      },
    ],
  },
];
