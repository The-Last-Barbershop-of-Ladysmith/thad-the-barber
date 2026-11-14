import { testMonthView } from '../../../../testing/test-availability';
import { testConfirmation } from '../../../../testing/test-booking';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { LookupStep } from '../models/lookup-step.model';
import { Action } from '@ngrx/store';
import { Notice } from '../../../shared/models/notice.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import { CODE_SENT_NOTICE } from '../config/booking-notices';
import * as BookingActions from './booking.actions';
import { bookingReducer } from './booking.reducer';
import { BookingState, initialBookingState } from './booking.state';

const availableDays: AvailableDay[] = [
  { date: '2026-10-03', times: ['2026-10-03T20:00:00Z', '2026-10-03T20:30:00Z'] },
  { date: '2026-10-04', times: ['2026-10-04T23:30:00Z'] },
];

const foundBookings: FoundBooking[] = [
  {
    id: 'made-up-first',
    startAt: '2026-10-03T20:00:00Z',
    manageToken: 'made-up-first-token',
  },
  {
    id: 'made-up-second',
    startAt: '2026-10-04T23:30:00Z',
    manageToken: 'made-up-second-token',
  },
];

const saturday: BookingConfirmation = testConfirmation('2026-10-03T20:00:00Z', 'made-up-saturday');

const october: BookingState = {
  ...initialBookingState,
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

        expect(bookingReducer(sent, BookingActions.BookingPageOpen({ pickedStartAt: null }))).toEqual(october);
      },
    );

    it(
      'keeps a booking still being sent when the page opens again, so another send waits for it',
      (): void => {
        const sending: BookingState = { ...october, submitStatus: RequestStatus.Pending };

        const reopened: BookingState = bookingReducer(sending, BookingActions.BookingPageOpen({ pickedStartAt: null }));

        expect(reopened.submitStatus).toBe(RequestStatus.Pending);
      },
    );

    describe(
      'looking up bookings',
      (): void => {
        const phone: string = '+15555550123';
        const lookupNotice: Notice = {
          severity: NoticeSeverity.Warn,
          text: 'Made-up lookup notice.',
          canRetry: false,
        };
        const codeAsked: BookingState = { ...initialBookingState, lookupStep: LookupStep.Code };
        const codeSent: BookingState = { ...codeAsked, lookupNotice: CODE_SENT_NOTICE };
        const found: BookingState = {
          ...initialBookingState,
          lookupStep: LookupStep.Results,
          foundBookings,
        };

        it(
          'shows a request pending and drops the last notice, in the step it was sent from',
          (): void => {
            const failed: BookingState = {
              ...codeAsked,
              lookupStatus: RequestStatus.Error,
              lookupNotice,
            };

            expect(bookingReducer(failed, BookingActions.LookupVerifyRequest({ phone, code: '0042' }))).toEqual({
              ...codeAsked,
              lookupStatus: RequestStatus.Pending,
            });
            expect(bookingReducer(failed, BookingActions.LookupStartRequest({ phone })).lookupStep)
              .toBe(LookupStep.Code);
          },
        );

        it(
          'moves to the code step with a confirmation once it is sent, and to the results once it is verified',
          (): void => {
            const asking: BookingState = { ...initialBookingState, lookupStatus: RequestStatus.Pending };

            expect(bookingReducer(asking, BookingActions.LookupStartRequestSuccess())).toEqual(codeSent);
            expect(bookingReducer(
              { ...codeAsked, lookupStatus: RequestStatus.Pending },
              BookingActions.LookupVerifyRequestSuccess({ foundBookings }),
            )).toEqual(found);
          },
        );

        it(
          'keeps the step and shows the notice when a request fails, so the code can be retried',
          (): void => {
            const failed: BookingState = bookingReducer(
              { ...codeAsked, lookupStatus: RequestStatus.Pending },
              BookingActions.LookupVerifyRequestFailure({ notice: lookupNotice }),
            );

            expect(failed).toEqual({
              ...codeAsked,
              lookupStatus: RequestStatus.Error,
              lookupNotice,
            });
            expect(bookingReducer(
              { ...initialBookingState, lookupStatus: RequestStatus.Pending },
              BookingActions.LookupStartRequestFailure({ notice: lookupNotice }),
            ).lookupNotice).toBe(lookupNotice);
          },
        );

        it(
          'goes back to the phone step without a notice, keeping nothing but the step',
          (): void => {
            const failed: BookingState = {
              ...codeAsked,
              lookupStatus: RequestStatus.Error,
              lookupNotice,
            };

            expect(bookingReducer(failed, BookingActions.LookupPhoneChange())).toEqual(initialBookingState);
          },
        );

        it(
          'forgets everything found when the page resets, and leaves the rest of the slice alone',
          (): void => {
            expect(bookingReducer(
              {
                ...october,
                lookupStep: LookupStep.Results,
                foundBookings,
              },
              BookingActions.LookupReset(),
            )).toEqual(october);
          },
        );
      },
    );
  },
);
