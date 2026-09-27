import { type MemoizedSelector, createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { fromIsoDate } from '../../../shared/utils/date.utils';
import { type TimeSlot } from '../models/booking.models';
import {
  BookingApiActions,
  BookingPageActions,
  type ConfirmationPayload,
  type DatePayload,
  type ErrorPayload,
  type MonthAvailabilityPayload,
  type MonthPayload,
  type SlotsPayload,
  type TimePayload,
} from './booking.actions';
import { type BookingState, type BookingStatus, initialBookingState } from './booking.state';

/** Changing the date, time or details after booking starts a fresh booking. */
const clearOutcome: Pick<BookingState, 'status' | 'confirmation' | 'error'> = {
  status: 'idle',
  confirmation: null,
  error: null,
};

/**
 * `createFeature` scopes everything under the `booking` key: it generates `selectBookingState`
 * plus one selector per property. The derived selectors below build on those scoped selectors.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: 'booking',
  reducer: createReducer(
    initialBookingState,
    on(
      BookingPageActions.monthViewed,
      (
        state: BookingState,
        { month }: MonthPayload,
      ): BookingState => ({
        ...state,
        visibleMonth: month,
      }),
    ),
    on(
      BookingApiActions.monthAvailabilityLoaded,
      (
        state: BookingState,
        {
          month,
          unavailableDates,
        }: MonthAvailabilityPayload,
      ): BookingState =>
        month === state.visibleMonth
          ? {
            ...state,
            unavailableDates,
          }
          : state,
    ),
    on(
      BookingPageActions.dateSelected,
      (
        state: BookingState,
        { date }: DatePayload,
      ): BookingState => ({
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
      (
        state: BookingState,
        {
          date,
          slots,
        }: SlotsPayload,
      ): BookingState =>
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
      (
        state: BookingState,
        { error }: ErrorPayload,
      ): BookingState => ({
        ...state,
        slotsLoading: false,
        error,
      }),
    ),
    on(
      BookingPageActions.timeSelected,
      (
        state: BookingState,
        { time }: TimePayload,
      ): BookingState => ({
        ...state,
        ...clearOutcome,
        selectedTime: time,
      }),
    ),
    on(
      BookingPageActions.detailsEdited,
      (state: BookingState): BookingState =>
        state.status === 'booked'
          ? {
            ...state,
            ...clearOutcome,
          }
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
      (
        state: BookingState,
        { confirmation }: ConfirmationPayload,
      ): BookingState => ({
        ...state,
        status: 'booked',
        confirmation,
      }),
    ),
    on(
      BookingApiActions.bookingFailed,
      (
        state: BookingState,
        { error }: ErrorPayload,
      ): BookingState => ({
        ...state,
        status: 'error',
        error,
      }),
    ),
  ),
});

export const {
  selectBookingState,
  selectVisibleMonth,
  selectUnavailableDates,
  selectSelectedDate,
  selectSelectedTime,
  selectSlots,
  selectSlotsLoading,
  selectStatus,
  selectConfirmation,
  selectError,
}: typeof bookingFeature = bookingFeature;

export const selectSelectedDay: MemoizedSelector<object, Date | null> = createSelector(
  selectSelectedDate,
  (iso: string | null): Date | null => (iso ? fromIsoDate(iso) : null),
);

export const selectDisabledDates: MemoizedSelector<object, Date[]> = createSelector(
  selectUnavailableDates,
  (dates: string[]): Date[] => dates.map((iso: string): Date => fromIsoDate(iso)),
);

export const selectOpenSlotCount: MemoizedSelector<object, number> = createSelector(
  selectSlots,
  (slots: TimeSlot[]): number => slots.filter((slot: TimeSlot): boolean => slot.available).length,
);

export const selectSelectedSlot: MemoizedSelector<object, TimeSlot | null> = createSelector(
  selectSlots,
  selectSelectedTime,
  (
    slots: TimeSlot[],
    time: string | null,
  ): TimeSlot | null => slots.find((slot: TimeSlot): boolean => slot.time === time) ?? null,
);

export const selectIsSubmitting: MemoizedSelector<object, boolean> = createSelector(
  selectStatus,
  (status: BookingStatus): boolean => status === 'submitting',
);

export const selectIsBooked: MemoizedSelector<object, boolean> = createSelector(
  selectStatus,
  (status: BookingStatus): boolean => status === 'booked',
);
