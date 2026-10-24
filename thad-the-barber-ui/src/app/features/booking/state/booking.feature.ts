import {
  MemoizedSelector,
  createFeature,
  createSelector,
} from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { fromIsoDate } from '../../../shared/utils/date.utils';
import { TimeSlot } from '../models/booking.models';
import { bookingReducer } from './booking.reducer';
import { BookingState, BookingStatus } from './booking.state';

/** Selectors derived from the generated ones; exposed on `bookingFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type BookingExtraSelectors = {
  selectSelectedDay: MemoizedSelector<object, Date | null>;
  selectDisabledDates: MemoizedSelector<object, Date[]>;
  selectOpenSlotCount: MemoizedSelector<object, number>;
  selectSelectedSlot: MemoizedSelector<object, TimeSlot | null>;
  selectIsSubmitting: MemoizedSelector<object, boolean>;
  selectIsBooked: MemoizedSelector<object, boolean>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-booking`). */
export const bookingFeatureKey: 'booking' = 'booking' as const;

/**
 * The booking page's picked day and time, the month's availability and the booking's outcome. Registered by the
 * booking route.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: bookingFeatureKey,
  reducer: bookingReducer,
  extraSelectors: ({
    selectUnavailableDates,
    selectSelectedDate,
    selectSelectedTime,
    selectSlots,
    selectStatus,
  }: FeatureSelectors<BookingState>): BookingExtraSelectors => ({
    selectSelectedDay: createSelector(
      selectSelectedDate,
      toSelectedDay,
    ),
    selectDisabledDates: createSelector(
      selectUnavailableDates,
      (unavailableDates: string[]): Date[] => unavailableDates.map((iso: string): Date => fromIsoDate(iso)),
    ),
    selectOpenSlotCount: createSelector(
      selectSlots,
      (slots: TimeSlot[]): number => slots.filter((slot: TimeSlot): boolean => slot.available).length,
    ),
    selectSelectedSlot: createSelector(
      selectSlots,
      selectSelectedTime,
      (
        slots: TimeSlot[],
        selectedTime: string | null,
      ): TimeSlot | null => slots.find((slot: TimeSlot): boolean => slot.time === selectedTime) ?? null,
    ),
    selectIsSubmitting: createSelector(
      selectStatus,
      (status: BookingStatus): boolean => status === 'submitting',
    ),
    selectIsBooked: createSelector(
      selectStatus,
      (status: BookingStatus): boolean => status === 'booked',
    ),
  }),
});

export function toSelectedDay(selectedDate: string | null): Date | null {
  if (selectedDate === null) {
    return null;
  }
  return fromIsoDate(selectedDate);
}
