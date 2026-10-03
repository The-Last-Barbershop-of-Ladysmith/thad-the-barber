import {
  ActionReducer,
  createReducer,
  on,
} from '@ngrx/store';
import {
  BookingApiActions,
  BookingPageActions,
  ConfirmationPayload,
  DatePayload,
  ErrorPayload,
  MonthAvailabilityPayload,
  MonthPayload,
  SlotsPayload,
  TimePayload,
} from './booking.actions';
import { BookingState, initialBookingState } from './booking.state';

/** Changing the date, time or details after booking starts a fresh booking. */
const clearOutcome: Pick<BookingState, 'status' | 'confirmation' | 'error'> = {
  status: 'idle',
  confirmation: null,
  error: null,
};

export const bookingReducer: ActionReducer<BookingState> = createReducer(
  initialBookingState,
  on(BookingPageActions.stateReset, (): BookingState => initialBookingState),
  on(
    BookingPageActions.monthViewed,
    (state: BookingState, { month }: MonthPayload): BookingState => ({ ...state, visibleMonth: month }),
  ),
  on(
    BookingApiActions.monthAvailabilityLoaded,
    (state: BookingState, { month, unavailableDates }: MonthAvailabilityPayload): BookingState =>
      month === state.visibleMonth
        ? { ...state, unavailableDates }
        : state,
  ),
  on(
    BookingPageActions.dateSelected,
    (state: BookingState, { date }: DatePayload): BookingState => ({
      ...state,
      ...clearOutcome,
      selectedDate: date,
      selectedTime: null,
      slots: [],
      slotsLoading: true,
    }),
  ),
  on(
    BookingApiActions.slotsLoaded,
    (state: BookingState, { date, slots }: SlotsPayload): BookingState =>
      date === state.selectedDate
        ? {
          ...state,
          slots,
          slotsLoading: false,
        }
        : state,
  ),
  on(
    BookingApiActions.slotsLoadFailed,
    (state: BookingState, { error }: ErrorPayload): BookingState => ({
      ...state,
      slotsLoading: false,
      error,
    }),
  ),
  on(
    BookingPageActions.timeSelected,
    (state: BookingState, { time }: TimePayload): BookingState => ({
      ...state,
      ...clearOutcome,
      selectedTime: time,
    }),
  ),
  on(
    BookingPageActions.detailsEdited,
    (state: BookingState): BookingState =>
      state.status === 'booked'
        ? { ...state, ...clearOutcome }
        : state,
  ),
  on(
    BookingPageActions.confirmRequested,
    (state: BookingState): BookingState => ({
      ...state,
      status: 'submitting',
      error: null,
    }),
  ),
  on(
    BookingApiActions.bookingConfirmed,
    (state: BookingState, { confirmation }: ConfirmationPayload): BookingState => ({
      ...state,
      status: 'booked',
      confirmation,
    }),
  ),
  on(
    BookingApiActions.bookingFailed,
    (state: BookingState, { error }: ErrorPayload): BookingState => ({
      ...state,
      status: 'error',
      error,
    }),
  ),
);
