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
  dayRange: testMonthView('2026-10'),
  availableDays,
  loadStatus: RequestStatus.Error,
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
      'empties the calendar and shows it loading while a month loads',
      (): void => {
        const state: BookingState = bookingReducer(october, BookingActions.AvailabilityRequest({ dayRange: testMonthView('2026-11') }));

        expect(state).toEqual({
          ...october,
          dayRange: testMonthView('2026-11'),
          availableDays: [],
          loadStatus: RequestStatus.Pending,
        });
      },
    );

    it(
      'counts a booking or a move that went through as done',
      (): void => {
        const booked: BookingState = bookingReducer(
          october,
          BookingActions.BookingRequestSuccess({ bookingConfirmation: saturday }),
        );

        expect(booked.submitStatus).toBe(RequestStatus.Success);
        expect(bookingReducer(october, moveTo(saturday.id, '2026-10-05T16:00:00Z')).submitStatus)
          .toBe(RequestStatus.Success);
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
      'starts the booking over when the page opens',
      (): void => {
        const sent: BookingState = {
          ...october,
          submitStatus: RequestStatus.Success,
          submitNotice: failedNotice,
        };

        expect(bookingReducer(sent, BookingActions.BookingPageOpen())).toEqual(october);
      },
    );

    it(
      'keeps a booking still being sent when the page opens again, so another send waits for it',
      (): void => {
        const sending: BookingState = { ...october, submitStatus: RequestStatus.Pending };

        expect(bookingReducer(sending, BookingActions.BookingPageOpen()).submitStatus).toBe(RequestStatus.Pending);
      },
    );
  },
);
