import { BookingConfirmation } from '../app/features/booking/dtos/booking-confirmation.dto';
import { encodeBase64 } from '../app/shared/utils/base64.utils';

const DAY_MS: number = 24 * 60 * 60 * 1000;

/**
 * A made-up booking for unit and e2e tests of BR-22's saved confirmations. It's dropped once `startAt` passes, so tests
 * on the real clock pass a time still to come (`testConfirmationIn`).
 */
export function testConfirmation(
  startAt: string = '2026-10-03T20:00:00Z',
  id: string = 'made-up-booking',
): BookingConfirmation {
  return {
    id,
    startAt,
    manageToken: `made-up-manage-token-for-${id}`,
  };
}

/** A made-up booking `days` from now on the real clock; negative for one that has started. */
export function testConfirmationIn(days: number, id: string): BookingConfirmation {
  return testConfirmation(new Date(Date.now() + days * DAY_MS).toISOString(), id);
}

/** The `ttb-booking` localStorage value holding these bookings, as the app saves it. */
export function encodeSavedBookings(savedConfirmations: BookingConfirmation[]): string {
  return encodeBase64(JSON.stringify({ savedConfirmations }));
}
