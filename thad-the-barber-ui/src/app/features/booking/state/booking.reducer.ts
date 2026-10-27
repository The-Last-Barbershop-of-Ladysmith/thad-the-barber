import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../models/available-day.model';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import * as BookingActions from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(
    BookingActions.SetActiveMonthView,
    (state: BookingState, { month }: { month: string | null; }): BookingState => ({
      ...state,
      visibleMonth: month,
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
    BookingActions.MonthAvailabilityRequestSuccess,
    (
      state: BookingState,
      { month, availableDays }: { month: string | null; availableDays: AvailableDay[]; },
    ): BookingState => {
      const isVisibleMonth: boolean = month === state.visibleMonth;
      if (!isVisibleMonth) {
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
    BookingActions.MonthAvailabilityRequestFailure,
    (state: BookingState, { month }: { month: string | null; }): BookingState => {
      const isVisibleMonth: boolean = month === state.visibleMonth;
      if (!isVisibleMonth) {
        return state;
      }
      return { ...state, loadStatus: RequestStatus.Error };
    },
  ),
);
