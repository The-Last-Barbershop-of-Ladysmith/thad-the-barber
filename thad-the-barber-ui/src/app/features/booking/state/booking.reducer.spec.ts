import { testConfirmation } from '../../../../testing/test-booking';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import * as BookingActions from './booking.actions';
import { bookingReducer } from './booking.reducer';
import { BookingState, initialBookingState } from './booking.state';
import { toMonthView } from '../utils/booking-time.utils';

const availableDays: AvailableDay[] = [
  { date: '2026-10-03', times: ['2026-10-03T20:00:00Z', '2026-10-03T20:30:00Z'] },
  { date: '2026-10-04', times: ['2026-10-04T23:30:00Z'] },
];

const saturday: BookingConfirmation = testConfirmation('2026-10-03T20:00:00Z', 'made-up-saturday');

const october: BookingState = {
  availabilityView: toMonthView('2026-10'),
  availableDays,
  loadStatus: RequestStatus.Error,
  savedConfirmations: [saturday],
};

describe(
  'booking reducer',
  (): void => {
    it(
      'empties the calendar and shows it loading while a month loads, keeping the saved bookings',
      (): void => {
        const state: BookingState = bookingReducer(october, BookingActions.SetAvailabilityView({ availabilityView: toMonthView('2026-11') }));

        expect(state).toEqual({
          availabilityView: toMonthView('2026-11'),
          availableDays: [],
          loadStatus: RequestStatus.Pending,
          savedConfirmations: [saturday],
        });
      },
    );

    it(
      'adds each booking to the saved ones, soonest first',
      (): void => {
        const friday: BookingConfirmation = testConfirmation('2026-10-02T14:00:00Z', 'made-up-friday');
        const sunday: BookingConfirmation = testConfirmation('2026-10-04T15:00:00Z', 'made-up-sunday');
        const withSunday: BookingState = bookingReducer(
          october,
          BookingActions.BookingConfirm({ bookingConfirmation: sunday }),
        );
        const state: BookingState = bookingReducer(
          withSunday,
          BookingActions.BookingConfirm({ bookingConfirmation: friday }),
        );

        expect(state.savedConfirmations).toEqual([
          friday,
          saturday,
          sunday,
        ]);
      },
    );

    it(
      'replaces a saved booking confirmed again, instead of listing it twice',
      (): void => {
        const moved: BookingConfirmation = { ...saturday, startAt: '2026-10-03T21:00:00Z' };
        const state: BookingState = bookingReducer(
          october,
          BookingActions.BookingConfirm({ bookingConfirmation: moved }),
        );

        expect(state.savedConfirmations).toEqual([moved]);
      },
    );

    it(
      "replaces the saved bookings with another tab's",
      (): void => {
        const fromOtherTab: BookingConfirmation[] = [testConfirmation('2026-10-05T16:00:00Z', 'made-up-other-tab')];
        const state: BookingState = bookingReducer(
          october,
          BookingActions.SavedConfirmationsAdopt({ savedConfirmations: fromOtherTab }),
        );

        expect(state.savedConfirmations).toEqual(fromOtherTab);
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
