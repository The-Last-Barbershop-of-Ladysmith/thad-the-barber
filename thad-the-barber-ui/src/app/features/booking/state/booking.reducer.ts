import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { Notice } from '../../../shared/models/notice.model';
import { toSortedConfirmations } from '../utils/saved-confirmation.utils';
import * as BookingActions from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(
    BookingActions.SetAvailabilityView,
    (state: BookingState, { availabilityView }: { availabilityView: AvailabilityView; }): BookingState => ({
      ...state,
      availabilityView,
      availableDays: [],
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    BookingActions.BookingPageOpen,
    (state: BookingState): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Idle,
      submitNotice: null,
      idempotencyKey: null,
    }),
  ),
  on(
    BookingActions.BookingDraftChange,
    (state: BookingState, { isNoticeKept }: { isNoticeKept: boolean; }): BookingState => ({
      ...state,
      submitNotice: isNoticeKept ? state.submitNotice : null,
      idempotencyKey: null,
    }),
  ),
  on(
    BookingActions.BookingRequest,
    (state: BookingState, { bookingRequest }: { bookingRequest: BookingRequest; }): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Pending,
      submitNotice: null,
      idempotencyKey: bookingRequest.idempotencyKey,
    }),
  ),
  on(
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
    (state: BookingState, { notice }: { notice: Notice | null; }): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Error,
      submitNotice: notice,
    }),
  ),
  on(
    BookingActions.BookingRequestSuccess,
    (state: BookingState, { bookingConfirmation }: { bookingConfirmation: BookingConfirmation; }): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Success,
      idempotencyKey: null,
      savedConfirmations: toSortedConfirmations([
        ...state.savedConfirmations.filter((savedConfirmation: BookingConfirmation): boolean =>
          savedConfirmation.id !== bookingConfirmation.id),
        bookingConfirmation,
      ]),
    }),
  ),
  on(
    BookingActions.SavedConfirmationsAdopt,
    (state: BookingState, { savedConfirmations }: { savedConfirmations: BookingConfirmation[]; }): BookingState => ({
      ...state,
      savedConfirmations: toSortedConfirmations(savedConfirmations),
    }),
  ),
  on(
    BookingActions.SavedConfirmationRemove,
    (state: BookingState, { bookingId }: { bookingId: string; }): BookingState => ({
      ...state,
      savedConfirmations: state.savedConfirmations.filter((savedConfirmation: BookingConfirmation): boolean =>
        savedConfirmation.id !== bookingId),
    }),
  ),
  on(
    BookingActions.RescheduleRequestSuccess,
    (state: BookingState, { managedBooking }: { managedBooking: ManagedBooking; }): BookingState => ({
      ...state,
      submitStatus: RequestStatus.Success,
      savedConfirmations: toSortedConfirmations(state.savedConfirmations
        .map((savedConfirmation: BookingConfirmation): BookingConfirmation =>
          (savedConfirmation.id === managedBooking.id
            ? { ...savedConfirmation, startAt: managedBooking.startAt }
            : savedConfirmation))),
    }),
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
);
