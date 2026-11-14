import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { DayRange } from '../models/day-range.model';
import { LookupStep } from '../models/lookup-step.model';
import { Notice } from '../../../shared/models/notice.model';
import * as BookingActions from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(
    BookingActions.AvailabilityRequest,
    (state: BookingState, { dayRange }: { dayRange: DayRange; }): BookingState => ({
      ...state,
      dayRange,
      availableDays: [],
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    BookingActions.BookingPageOpen,
    (state: BookingState): BookingState => ({
      ...state,
      // A booking still being sent, from before the customer left and came back, finishes first: another send now
      // would be dropped while it runs.
      submitStatus: state.submitStatus === RequestStatus.Pending ? RequestStatus.Pending : RequestStatus.Idle,
      submitNotice: null,
    }),
  ),
  on(
    BookingActions.BookingRequest,
    BookingActions.RescheduleRequest,
    (state: BookingState): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Pending,
      submitNotice: null,
    }),
  ),
  on(
    BookingActions.BookingRequestFailure,
    BookingActions.RescheduleRequestFailure,
    (
      state: BookingState,
      { notice, takenStartAt }: { notice: Notice | null; takenStartAt: string | null; },
    ): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Error,
      submitNotice: notice,
      availableDays: state.availableDays
        .map((availableDay: AvailableDay): AvailableDay => ({
          ...availableDay,
          times: availableDay.times.filter((startAt: string): boolean => startAt !== takenStartAt),
        }))
        .filter((availableDay: AvailableDay): boolean => availableDay.times.length > 0),
    }),
  ),
  on(
    BookingActions.BookingRequestSuccess,
    BookingActions.RescheduleRequestSuccess,
    (state: BookingState): BookingState => ({ ...state, submitStatus: RequestStatus.Success }),
  ),
  on(
    BookingActions.AvailabilityRequestSuccess,
    (state: BookingState, { availableDays }: { availableDays: AvailableDay[]; }): BookingState => ({
      ...state,
      availableDays,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    BookingActions.AvailabilityRequestFailure,
    (state: BookingState): BookingState => ({ ...state, loadStatus: RequestStatus.Error }),
  ),
  on(
    BookingActions.LookupReset,
    (state: BookingState): BookingState => ({
      ...state,
      lookupStep: initialBookingState.lookupStep,
      lookupStatus: initialBookingState.lookupStatus,
      lookupNotice: null,
      foundBookings: [],
    }),
  ),
  on(
    BookingActions.LookupPhoneChange,
    (state: BookingState): BookingState => ({
      ...state,
      lookupStep: LookupStep.Phone,
      lookupStatus: RequestStatus.Idle,
      lookupNotice: null,
    }),
  ),
  on(
    BookingActions.LookupStartRequest,
    BookingActions.LookupVerifyRequest,
    (state: BookingState): BookingState => ({
      ...state,
      lookupStatus: RequestStatus.Pending,
      lookupNotice: null,
    }),
  ),
  on(
    BookingActions.LookupStartRequestSuccess,
    (state: BookingState): BookingState => ({
      ...state,
      lookupStep: LookupStep.Code,
      lookupStatus: RequestStatus.Idle,
    }),
  ),
  on(
    BookingActions.LookupVerifyRequestSuccess,
    (state: BookingState, { foundBookings }: { foundBookings: FoundBooking[]; }): BookingState => ({
      ...state,
      lookupStep: LookupStep.Results,
      lookupStatus: RequestStatus.Idle,
      foundBookings,
    }),
  ),
  on(
    BookingActions.LookupStartRequestFailure,
    BookingActions.LookupVerifyRequestFailure,
    (state: BookingState, { notice }: { notice: Notice; }): BookingState => ({
      ...state,
      lookupStatus: RequestStatus.Error,
      lookupNotice: notice,
    }),
  ),
);
