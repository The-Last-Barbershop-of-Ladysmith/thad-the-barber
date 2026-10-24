import {
  ActionReducer,
  createReducer,
  on,
} from '@ngrx/store';
import { BookingConfirmation, TimeSlot } from '../models/booking.models';
import * as BookingActions from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

/** Changing the date, time or details after booking starts a fresh booking. */
const clearOutcome: Pick<BookingState, 'status' | 'confirmation' | 'error'> = {
  status: 'idle',
  confirmation: null,
  error: null,
};

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(BookingActions.BookingStateReset, (): BookingState => initialBookingState),
  on(
    BookingActions.MonthView,
    (state: BookingState, { month }: { month: string; }): BookingState => ({ ...state, visibleMonth: month }),
  ),
  on(
    BookingActions.MonthAvailabilityRequestSuccess,
    (state: BookingState, { month, unavailableDates }: { month: string; unavailableDates: string[]; }): BookingState =>
      month === state.visibleMonth
        ? { ...state, unavailableDates }
        : state,
  ),
  on(
    BookingActions.DateSelect,
    (state: BookingState, { date }: { date: string; }): BookingState => ({
      ...state,
      ...clearOutcome,
      selectedDate: date,
      selectedTime: null,
      slots: [],
      slotsLoading: true,
    }),
  ),
  on(
    BookingActions.SlotsRequestSuccess,
    (state: BookingState, { date, slots }: { date: string; slots: TimeSlot[]; }): BookingState =>
      date === state.selectedDate
        ? {
          ...state,
          slots,
          slotsLoading: false,
        }
        : state,
  ),
  on(
    BookingActions.SlotsRequestFailure,
    (state: BookingState, { error }: { error: string; }): BookingState => ({
      ...state,
      slotsLoading: false,
      error,
    }),
  ),
  on(
    BookingActions.TimeSelect,
    (state: BookingState, { time }: { time: string; }): BookingState => ({
      ...state,
      ...clearOutcome,
      selectedTime: time,
    }),
  ),
  on(
    BookingActions.DetailsEdit,
    (state: BookingState): BookingState =>
      state.status === 'booked'
        ? { ...state, ...clearOutcome }
        : state,
  ),
  on(
    BookingActions.BookingConfirmRequest,
    (state: BookingState): BookingState => ({
      ...state,
      status: 'submitting',
      error: null,
    }),
  ),
  on(
    BookingActions.BookingConfirmRequestSuccess,
    (state: BookingState, { confirmation }: { confirmation: BookingConfirmation; }): BookingState => ({
      ...state,
      status: 'booked',
      confirmation,
    }),
  ),
  on(
    BookingActions.BookingConfirmRequestFailure,
    (state: BookingState, { error }: { error: string; }): BookingState => ({
      ...state,
      status: 'error',
      error,
    }),
  ),
);
