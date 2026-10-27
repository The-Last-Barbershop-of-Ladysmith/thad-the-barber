import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Booking } from '../booking';
import { leaveBookingGuard } from './leave-booking.guard';

describe(
  'leaveBookingGuard',
  (): void => {
    it(
      "leaves the decision to the booking page's confirmLeave",
      async (): Promise<void> => {
        const askingPage: Booking = {
          confirmLeave: (): Promise<boolean> => Promise.resolve(false),
        } as unknown as Booking;
        const emptyPage: Booking = { confirmLeave: (): boolean => true } as unknown as Booking;
        const route: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
        const state: RouterStateSnapshot = {} as RouterStateSnapshot;

        expect(await leaveBookingGuard(
          askingPage,
          route,
          state,
          state,
        )).toBe(false);
        expect(leaveBookingGuard(
          emptyPage,
          route,
          state,
          state,
        )).toBe(true);
      },
    );
  },
);
