import { type MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { fromIsoDate } from '../../../shared/utils/date.utils';
import { type TimeSlot } from '../models/booking.models';
import { bookingReducer } from './booking.reducer';
import { type BookingStatus } from './booking.state';

/**
 * `createFeature` scopes everything under the `booking` key: it generates `selectBookingState`
 * plus one selector per property. The derived selectors below build on those scoped selectors.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: 'booking',
  reducer: bookingReducer,
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
