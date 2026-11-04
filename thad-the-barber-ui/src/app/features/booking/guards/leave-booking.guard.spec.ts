import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { LeaveConfirmable } from '../models/leave-confirmable.model';
import { leaveBookingGuard } from './leave-booking.guard';

describe(
  'leaveBookingGuard',
  (): void => {
    let asked: Confirmation | null;

    function leave(page: LeaveConfirmable): boolean | Promise<boolean> {
      const state: RouterStateSnapshot = {} as RouterStateSnapshot;
      return TestBed.runInInjectionContext((): boolean | Promise<boolean> => leaveBookingGuard(
        page,
        {} as ActivatedRouteSnapshot,
        state,
        state,
      ) as boolean | Promise<boolean>);
    }

    function pageWith(
      hasUnconfirmedPick: boolean,
      isRescheduling: boolean = false,
      isSubmitting: boolean = false,
    ): LeaveConfirmable {
      return {
        hasUnconfirmedPick: signal(hasUnconfirmedPick),
        isRescheduling: signal(isRescheduling),
        isSubmitting: signal(isSubmitting),
      };
    }

    beforeEach((): void => {
      asked = null;
      TestBed.configureTestingModule({ providers: [ConfirmationService] });
      TestBed.inject(ConfirmationService).requireConfirmation$.subscribe((confirmation: Confirmation | null): void => {
        asked = confirmation;
      });
    });

    it(
      'lets the customer leave without asking while nothing is picked, or once it went through (#210)',
      (): void => {
        expect(leave(pageWith(false))).toBe(true);
        expect(asked).toBeNull();
      },
    );

    it(
      'keeps the customer on the page, without asking, while a booking or move is sent',
      (): void => {
        expect(leave(pageWith(
          true,
          false,
          true,
        ))).toBe(false);
        expect(leave(pageWith(
          true,
          true,
          true,
        ))).toBe(false);
        expect(asked).toBeNull();
      },
    );

    it(
      'asks "Leave without booking?" before leaving a picked day, and Keep booking stays (#210)',
      async (): Promise<void> => {
        const canLeave: boolean | Promise<boolean> = leave(pageWith(true));
        asked?.reject?.();

        expect(asked?.header).toBe('Leave without booking?');
        expect(asked?.defaultFocus).toBe('reject');
        expect(await canLeave).toBe(false);
      },
    );

    it(
      'asks "Leave without moving?" while rescheduling, and Leave goes',
      async (): Promise<void> => {
        const canLeave: boolean | Promise<boolean> = leave(pageWith(true, true));
        asked?.accept?.();

        expect(asked?.header).toBe('Leave without moving?');
        expect(await canLeave).toBe(true);
      },
    );
  },
);
