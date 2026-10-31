import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { isSameView } from '../utils/booking-time.utils';
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
    BookingActions.BookingConfirm,
    (state: BookingState, { bookingConfirmation }: { bookingConfirmation: BookingConfirmation; }): BookingState => ({
      ...state,
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
      savedConfirmations,
    }),
  ),
  on(
    BookingActions.AvailabilityRequestSuccess,
    (
      state: BookingState,
      { availabilityView, availableDays }: { availabilityView: AvailabilityView; availableDays: AvailableDay[]; },
    ): BookingState => {
      const isViewInPlace: boolean = isSameView(availabilityView, state.availabilityView);
      if (!isViewInPlace) {
        return state;
      }
      return {
        ...state,
        availableDays,
        loadStatus: RequestStatus.Success,
      };
    },
  ),
  on(
    BookingActions.AvailabilityRequestFailure,
    (state: BookingState, { availabilityView }: { availabilityView: AvailabilityView; }): BookingState => {
      const isViewInPlace: boolean = isSameView(availabilityView, state.availabilityView);
      if (!isViewInPlace) {
        return state;
      }
      return { ...state, loadStatus: RequestStatus.Error };
    },
  ),
);
