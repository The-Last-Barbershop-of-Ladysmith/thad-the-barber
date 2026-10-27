import { CanDeactivateFn } from '@angular/router';
import { Booking } from '../booking';

/** Asks before leaving a booking that isn't confirmed (#210); the page decides whether there's anything to lose. */
export const leaveBookingGuard: CanDeactivateFn<Booking> = (booking: Booking): boolean | Promise<boolean> =>
  booking.confirmLeave();
