import { BookingConfirmation } from '../app/features/booking/dtos/booking-confirmation.dto';

/**
 * A made-up booking for unit and e2e tests of BR-22's saved confirmations. It's dropped once `startAt` passes, so tests
 * on the real clock pass a time still to come.
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
