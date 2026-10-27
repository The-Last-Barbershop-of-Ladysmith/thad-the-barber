import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import { isSameView } from '../utils/booking-time.utils';
import * as BookingActions from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(
    BookingActions.SetAvailabilityView,
    (state: BookingState, { view }: { view: AvailabilityView; }): BookingState => ({
      ...state,
      view,
      availableDays: [],
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    BookingActions.BookingConfirm,
    (state: BookingState, { savedConfirmation }: { savedConfirmation: SavedConfirmation; }): BookingState => ({
      ...state,
      savedConfirmation,
    }),
  ),
  on(
    BookingActions.AvailabilityRequestSuccess,
    (
      state: BookingState,
      { view, availableDays }: { view: AvailabilityView; availableDays: AvailableDay[]; },
    ): BookingState => {
      const isViewInPlace: boolean = isSameView(view, state.view);
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
    (state: BookingState, { view }: { view: AvailabilityView; }): BookingState => {
      const isViewInPlace: boolean = isSameView(view, state.view);
      if (!isViewInPlace) {
        return state;
      }
      return { ...state, loadStatus: RequestStatus.Error };
    },
  ),
);
