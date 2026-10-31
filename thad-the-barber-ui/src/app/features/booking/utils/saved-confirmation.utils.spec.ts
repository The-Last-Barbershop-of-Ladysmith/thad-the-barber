import { testConfirmation } from '../../../../testing/test-booking';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { toKeptConfirmations, toSortedConfirmations, toUpcomingConfirmations } from './saved-confirmation.utils';

const earlier: BookingConfirmation = testConfirmation('2026-10-03T20:00:00Z', 'made-up-earlier-booking');
const later: BookingConfirmation = testConfirmation('2026-10-10T14:30:00Z', 'made-up-later-booking');
const beforeBoth: Date = new Date('2026-10-01T12:00:00Z');

describe(
  'toSortedConfirmations',
  (): void => {
    it(
      'puts the soonest booking first without changing the list it was given',
      (): void => {
        const confirmations: BookingConfirmation[] = [later, earlier];

        expect(toSortedConfirmations(confirmations)).toEqual([earlier, later]);
        expect(confirmations).toEqual([later, earlier]);
      },
    );
  },
);

describe(
  'toUpcomingConfirmations',
  (): void => {
    it(
      'keeps every booking still to come, in the order given, with no age limit',
      (): void => {
        expect(toUpcomingConfirmations([later, earlier], beforeBoth)).toEqual([later, earlier]);
      },
    );

    it(
      'drops a booking from the moment it starts',
      (): void => {
        const atTheFirstStart: Date = new Date(earlier.startAt);

        expect(toUpcomingConfirmations([earlier, later], atTheFirstStart)).toEqual([later]);
      },
    );
  },
);

describe(
  'toKeptConfirmations',
  (): void => {
    it(
      'keeps the upcoming bookings, soonest first, and drops the started ones',
      (): void => {
        const started: BookingConfirmation = testConfirmation('2026-09-30T15:00:00Z', 'made-up-started-booking');

        expect(toKeptConfirmations({
          savedConfirmations: [
            later,
            started,
            earlier,
          ],
        }, beforeBoth))
          .toEqual({ savedConfirmations: [earlier, later] });
      },
    );

    it(
      'keeps only the ID, time and manage token, never a name or phone saved beside them',
      (): void => {
        const tampered: object = {
          savedConfirmations: [
            {
              ...earlier,
              name: 'Test Customer',
              phone: '+15550100199',
            },
          ],
          savedConfirmation: { booking: later, savedAt: '2026-10-01T11:00:00Z' },
        };

        expect(toKeptConfirmations(tampered, beforeBoth)).toEqual({ savedConfirmations: [earlier] });
      },
    );

    it(
      'skips malformed entries and reads anything else as no bookings instead of failing start-up',
      (): void => {
        const malformed: object = {
          savedConfirmations: [
            null,
            { id: 'made-up-no-token', startAt: later.startAt },
            { ...later, startAt: 'not a date' },
            earlier,
          ],
        };
        const unreadable: unknown[] = [
          null,
          'null',
          {},
          { savedConfirmations: 'not a list' },
        ];

        expect(toKeptConfirmations(malformed, beforeBoth)).toEqual({ savedConfirmations: [earlier] });
        for (const saved of unreadable) {
          expect(toKeptConfirmations(saved, beforeBoth)).toEqual({ savedConfirmations: [] });
        }
      },
    );
  },
);
