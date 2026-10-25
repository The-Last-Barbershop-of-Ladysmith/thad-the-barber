import {
  MemoizedSelector,
  createFeature,
  createSelector,
} from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import {
  addDays,
  fromMonthKey,
  toIsoDate,
} from '../../../shared/utils/date.utils';
import { AvailableDay } from '../models/available-day.model';
import { BookingNotice } from '../models/booking-notice.model';
import { AVAILABILITY_FAILED_NOTICE } from '../utils/booking-notice.utils';
import { bookingReducer } from './booking.reducer';
import { BookingState } from './booking.state';

/** Selectors derived from the generated ones; exposed on `bookingFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type BookingExtraSelectors = {
  selectDisabledDates: MemoizedSelector<object, Date[]>;
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectNotice: MemoizedSelector<object, BookingNotice | null>;
};

/** Store key for this slice. It isn't saved to localStorage (`store/meta/meta.reducers.ts`). */
export const bookingFeatureKey: 'booking' = 'booking' as const;

/** The booking page's month availability. Registered by the booking route. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: bookingFeatureKey,
  reducer: bookingReducer,
  extraSelectors: ({
    selectVisibleMonth,
    selectAvailableDays,
    selectLoadStatus,
  }: FeatureSelectors<BookingState>): BookingExtraSelectors => ({
    selectDisabledDates: createSelector(
      selectVisibleMonth,
      selectAvailableDays,
      toDisabledDates,
    ),
    selectIsLoading: createSelector(
      selectLoadStatus,
      toIsLoading,
    ),
    selectNotice: createSelector(
      selectLoadStatus,
      toAvailabilityNotice,
    ),
  }),
});

function toIsLoading(loadStatus: RequestStatus): boolean {
  return loadStatus === RequestStatus.Pending;
}

function toAvailabilityNotice(loadStatus: RequestStatus): BookingNotice | null {
  if (loadStatus !== RequestStatus.Error) {
    return null;
  }
  return AVAILABILITY_FAILED_NOTICE;
}

/** Every day of the visible month with no open times, including while it loads. */
function toDisabledDates(visibleMonth: string | null, availableDays: AvailableDay[]): Date[] {
  if (visibleMonth === null) {
    return [];
  }
  const openDates: Set<string> = new Set(availableDays.map((day: AvailableDay): string => day.date));
  const first: Date = fromMonthKey(visibleMonth);
  const disabled: Date[] = [];
  for (
    let date: Date = first;
    date.getMonth() === first.getMonth();
    date = addDays(date, 1)
  ) {
    if (!openDates.has(toIsoDate(date))) {
      disabled.push(date);
    }
  }
  return disabled;
}
