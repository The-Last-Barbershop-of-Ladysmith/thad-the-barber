import { testSavedConfirmation } from '../../../../testing/test-booking';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import { toKeptConfirmation } from './saved-confirmation.utils';

/** Saved 26 hours before its 2026-10-03T20:00Z appointment. */
const savedConfirmation: SavedConfirmation = testSavedConfirmation('2026-10-02T18:00:00Z');

describe(
  'toKeptConfirmation',
  (): void => {
    it(
      'keeps a confirmation saved less than 24 hours ago for an appointment still to come',
      (): void => {
        const almostADayLater: Date = new Date('2026-10-03T17:59:59Z');

        expect(toKeptConfirmation({ savedConfirmation }, almostADayLater)).toEqual({ savedConfirmation });
      },
    );

    it(
      'drops it once 24 hours have passed',
      (): void => {
        const aDayLater: Date = new Date('2026-10-03T18:00:00Z');

        expect(toKeptConfirmation({ savedConfirmation }, aDayLater)).toEqual({ savedConfirmation: null });
      },
    );

    it(
      'drops it once the appointment has started, even within 24 hours',
      (): void => {
        const bookedAnHourBefore: SavedConfirmation = testSavedConfirmation('2026-10-03T19:00:00Z');
        const atTheStart: Date = new Date('2026-10-03T20:00:00Z');

        expect(toKeptConfirmation({ savedConfirmation: bookedAnHourBefore }, atTheStart))
          .toEqual({ savedConfirmation: null });
      },
    );

    it(
      'returns only the confirmation, never other fields an older build saved under the key',
      (): void => {
        const olderBuildSlice: object = {
          savedConfirmation,
          confirmation: { name: 'Test Customer', phone: '+15550100199' },
          status: 'booked',
        };

        expect(toKeptConfirmation(olderBuildSlice, new Date('2026-10-03T12:00:00Z'))).toEqual({ savedConfirmation });
      },
    );

    it(
      'reads anything else as no confirmation instead of failing start-up',
      (): void => {
        const unreadable: unknown[] = [
          null,
          'null',
          {},
          { savedConfirmation: { savedAt: '2026-10-03T12:00:00Z' } },
          { savedConfirmation: { ...savedConfirmation, savedAt: 'not a date' } },
        ];

        for (const saved of unreadable) {
          expect(toKeptConfirmation(saved)).toEqual({ savedConfirmation: null });
        }
      },
    );
  },
);
