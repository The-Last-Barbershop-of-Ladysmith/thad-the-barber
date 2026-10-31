import { testSavedConfirmation } from '../../../../testing/test-booking';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import * as BookingActions from './booking.actions';
import { bookingReducer } from './booking.reducer';
import { BookingState, initialBookingState } from './booking.state';
import { toMonthView } from '../utils/booking-time.utils';

const availableDays: AvailableDay[] = [
  { date: '2026-10-03', times: ['2026-10-03T20:00:00Z', '2026-10-03T20:30:00Z'] },
  { date: '2026-10-04', times: ['2026-10-04T23:30:00Z'] },
];

const savedConfirmation: SavedConfirmation = testSavedConfirmation('2026-10-02T18:00:00Z');

const october: BookingState = {
  availabilityView: toMonthView('2026-10'),
  availableDays,
  loadStatus: RequestStatus.Error,
  savedConfirmation,
};

describe(
  'booking reducer',
  (): void => {
    it(
      'empties the calendar and shows it loading while a month loads, keeping the saved confirmation',
      (): void => {
        const state: BookingState = bookingReducer(october, BookingActions.SetAvailabilityView({ availabilityView: toMonthView('2026-11') }));

        expect(state).toEqual({
          availabilityView: toMonthView('2026-11'),
          availableDays: [],
          loadStatus: RequestStatus.Pending,
          savedConfirmation,
        });
      },
    );

    it(
      'keeps the latest booking, replacing an earlier one',
      (): void => {
        const later: SavedConfirmation = {
          booking: { ...savedConfirmation.booking, id: 'made-up-later-booking' },
          savedAt: '2026-10-02T19:00:00Z',
        };
        const state: BookingState = bookingReducer(
          october,
          BookingActions.BookingConfirm({ savedConfirmation: later }),
        );

        expect(state.savedConfirmation).toEqual(later);
      },
    );

    it(
      'keeps availability only for the month in view',
      (): void => {
        const viewing: BookingState = { ...initialBookingState, availabilityView: toMonthView('2026-11') };

        const stale: BookingState = bookingReducer(
          viewing,
          BookingActions.AvailabilityRequestSuccess({ availabilityView: toMonthView('2026-10'), availableDays }),
        );
        const current: BookingState = bookingReducer(
          { ...viewing, availabilityView: toMonthView('2026-10') },
          BookingActions.AvailabilityRequestSuccess({ availabilityView: toMonthView('2026-10'), availableDays }),
        );

        expect(stale.availableDays).toEqual([]);
        expect(current.availableDays).toEqual(availableDays);
        expect(current.loadStatus).toBe(RequestStatus.Success);
      },
    );

    it(
      'keeps a failed load only for the month in view',
      (): void => {
        const viewing: BookingState = {
          ...initialBookingState,
          availabilityView: toMonthView('2026-10'),
          loadStatus: RequestStatus.Pending,
        };

        const stale: BookingState = bookingReducer(
          viewing,
          BookingActions.AvailabilityRequestFailure({ availabilityView: toMonthView('2026-09') }),
        );
        const current: BookingState = bookingReducer(
          viewing,
          BookingActions.AvailabilityRequestFailure({ availabilityView: toMonthView('2026-10') }),
        );

        expect(stale.loadStatus).toBe(RequestStatus.Pending);
        expect(current.loadStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
