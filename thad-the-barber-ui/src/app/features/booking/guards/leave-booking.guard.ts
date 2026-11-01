import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { LeaveConfirmable } from '../models/leave-confirmable.model';

/** What the "Leave without …?" dialog says, booking or moving. */
interface LeaveQuestion {
  header: string;
  message: string;
  stayLabel: string;
}

const LEAVE_BOOKING: LeaveQuestion = {
  header: 'Leave without booking?',
  message: 'Your booking isn’t confirmed yet, so the time you picked isn’t held for you. If you leave, you’ll start over.',
  stayLabel: 'Keep booking',
};

const LEAVE_RESCHEDULING: LeaveQuestion = {
  header: 'Leave without moving?',
  message: 'Your appointment stays at its current time. The new time you picked isn’t held for you.',
  stayLabel: 'Keep rescheduling',
};

/**
 * With a picked day not yet booked or moved (#210), asks before leaving in the page's `p-confirmdialog`
 * (`key="leave-booking"`); staying is the default, and Escape stays too. Otherwise lets the customer go.
 * `ConfirmationService` comes from the booking routes, so the guard and the page's dialog share it.
 */
export const leaveBookingGuard: CanDeactivateFn<LeaveConfirmable> =
  (page: LeaveConfirmable): boolean | Promise<boolean> => {
    if (!page.hasUnconfirmedPick()) {
      return true;
    }
    const confirmationService: ConfirmationService = inject(ConfirmationService);
    const leaveQuestion: LeaveQuestion = page.isRescheduling() ? LEAVE_RESCHEDULING : LEAVE_BOOKING;
    return new Promise<boolean>((resolve: (canLeave: boolean) => void): void => {
      confirmationService.confirm({
        key: 'leave-booking',
        header: leaveQuestion.header,
        message: leaveQuestion.message,
        rejectButtonProps: { label: leaveQuestion.stayLabel },
        acceptButtonProps: {
          label: 'Leave',
          severity: 'secondary',
          outlined: true,
        },
        defaultFocus: 'reject',
        closeOnEscape: true,
        accept: (): void => {
          resolve(true);
        },
        reject: (): void => {
          resolve(false);
        },
      });
    });
  };
