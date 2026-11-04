import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { LeaveConfirmable } from '../models/leave-confirmable.model';

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

/** Asks in the page's `p-confirmdialog` (#210); staying is the default, and Escape stays too. */
export const leaveBookingGuard: CanDeactivateFn<LeaveConfirmable> =
  (bookingPage: LeaveConfirmable): boolean | Promise<boolean> => {
    if (!bookingPage.hasUnconfirmedPick()) {
      return true;
    }
    const confirmationService: ConfirmationService = inject(ConfirmationService);
    const leaveQuestion: LeaveQuestion = bookingPage.isRescheduling() ? LEAVE_RESCHEDULING : LEAVE_BOOKING;
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
