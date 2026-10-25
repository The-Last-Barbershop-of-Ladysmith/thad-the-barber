import { SavedConfirmation } from '../app/features/booking/models/saved-confirmation.model';

/**
 * A made-up booking kept since `savedAt` (ISO), for unit and e2e tests of BR-22's 24-hour confirmation. It's dropped
 * once `startAt` passes, so tests on the real clock pass a time still to come.
 */
export function testSavedConfirmation(savedAt: string, startAt: string = '2026-10-03T20:00:00Z'): SavedConfirmation {
  return {
    booking: {
      id: 'made-up-booking',
      startAt,
      manageToken: 'made-up-manage-token',
    },
    savedAt,
  };
}
