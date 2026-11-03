import { testMonthView } from '../../../../testing/test-availability';
import { testConfirmation } from '../../../../testing/test-booking';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { Action } from '@ngrx/store';
import { Notice } from '../../../shared/models/notice.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import * as BookingActions from './booking.actions';
import { bookingReducer } from './booking.reducer';
import { BookingState, initialBookingState } from './booking.state';

const availableDays: AvailableDay[] = [
  { date: '2026-10-03', times: ['2026-10-03T20:00:00Z', '2026-10-03T20:30:00Z'] },
  { date: '2026-10-04', times: ['2026-10-04T23:30:00Z'] },
];

const saturday: BookingConfirmation = testConfirmation('2026-10-03T20:00:00Z', 'made-up-saturday');

const october: BookingState = {
  availabilityView: testMonthView('2026-10'),
  availableDays,
  loadStatus: RequestStatus.Error,
  savedConfirmations: [saturday],
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
};

const failedNotice: Notice = {
  severity: NoticeSeverity.Error,
  text: 'Made-up failure.',
  canRetry: true,
};

function moveTo(bookingId: string, startAt: string): Action {
  return BookingActions.RescheduleRequestSuccess({
    managedBooking: {
      id: bookingId,
      startAt,
      isCancelled: false,
      canChange: true,
    },
    manageToken: 'made-up-token',
  });
}

describe(
  'booking reducer',
  (): void => {
    it(
      'empties the calendar and shows it loading while a month loads, keeping the saved bookings',
      (): void => {
        const state: BookingState = bookingReducer(october, BookingActions.SetAvailabilityView({ availabilityView: testMonthView('2026-11') }));

        expect(state).toEqual({
          ...october,
          availabilityView: testMonthView('2026-11'),
          availableDays: [],
          loadStatus: RequestStatus.Pending,
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
          BookingActions.BookingRequestSuccess({ bookingConfirmation: sunday }),
        );
        const state: BookingState = bookingReducer(
          withSunday,
          BookingActions.BookingRequestSuccess({ bookingConfirmation: friday }),
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
          BookingActions.BookingRequestSuccess({ bookingConfirmation: moved }),
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
      "drops a cancelled booking from this device's list, and leaves the list alone when it isn't there",
      (): void => {
        const removed: BookingState = bookingReducer(
          october,
          BookingActions.SavedConfirmationRemove({ bookingId: saturday.id }),
        );
        const untouched: BookingState = bookingReducer(
          october,
          BookingActions.SavedConfirmationRemove({ bookingId: 'made-up-opened-link' }),
        );

        expect(removed.savedConfirmations).toEqual([]);
        expect(untouched.savedConfirmations).toEqual([saturday]);
      },
    );

    it(
      "moves a rescheduled booking in this device's list, soonest first, and never adds one that isn't there",
      (): void => {
        const sunday: BookingConfirmation = testConfirmation('2026-10-04T15:00:00Z', 'made-up-sunday');
        const both: BookingState = { ...october, savedConfirmations: [saturday, sunday] };
        const moved: BookingState = bookingReducer(
          both,
          moveTo(saturday.id, '2026-10-05T16:00:00Z'),
        );
        const untouched: BookingState = bookingReducer(
          october,
          moveTo('made-up-opened-link', '2026-10-05T16:00:00Z'),
        );

        expect(moved.savedConfirmations).toEqual([sunday, { ...saturday, startAt: '2026-10-05T16:00:00Z' }]);
        expect(untouched.savedConfirmations).toEqual([saturday]);
      },
    );

    it(
      'stores the loaded days, or marks the load failed',
      (): void => {
        const pending: BookingState = { ...initialBookingState, loadStatus: RequestStatus.Pending };

        expect(bookingReducer(pending, BookingActions.AvailabilityRequestSuccess({ availableDays }))).toEqual({
          ...pending,
          availableDays,
          loadStatus: RequestStatus.Success,
        });
        expect(bookingReducer(pending, BookingActions.AvailabilityRequestFailure()).loadStatus)
          .toBe(RequestStatus.Error);
      },
    );

    it(
      'shows why the booking failed, and takes a taken time off the open times, dropping a day left with none',
      (): void => {
        const failed: BookingState = bookingReducer(
          october,
          BookingActions.BookingRequestFailure({ notice: failedNotice, takenStartAt: '2026-10-04T23:30:00Z' }),
        );

        expect(failed.submitStatus).toBe(RequestStatus.Error);
        expect(failed.submitNotice).toEqual(failedNotice);
        expect(failed.availableDays.map((availableDay: AvailableDay): string => availableDay.date))
          .not.toContain('2026-10-04');
        expect(bookingReducer(
          october,
          BookingActions.RescheduleRequestFailure({ notice: failedNotice, takenStartAt: null }),
        ).availableDays).toEqual(availableDays);
      },
    );

    it(
      'starts the booking over when the page opens, keeping the saved bookings',
      (): void => {
        const sent: BookingState = {
          ...october,
          submitStatus: RequestStatus.Success,
          submitNotice: failedNotice,
        };

        expect(bookingReducer(sent, BookingActions.BookingPageOpen())).toEqual(october);
      },
    );
  },
);
