import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { Notice } from '../../../shared/models/notice.model';
import { AVAILABILITY_FAILED_NOTICE } from '../utils/booking-notice.utils';
import { bookingReducer } from './booking.reducer';
import { BookingState } from './booking.state';

/** Selectors derived from the generated ones; exposed on `bookingFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type BookingExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectNotice: MemoizedSelector<object, Notice | null>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-booking`), holding only `savedConfirmations`. */
export const bookingFeatureKey: 'booking' = 'booking' as const;

/** The booking page's availability and the bookings made on this device. A root reducer (`app.config.ts`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: bookingFeatureKey,
  reducer: bookingReducer,
  extraSelectors: ({ selectLoadStatus }: FeatureSelectors<BookingState>): BookingExtraSelectors => ({
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

function toAvailabilityNotice(loadStatus: RequestStatus): Notice | null {
  if (loadStatus !== RequestStatus.Error) {
    return null;
  }
  return AVAILABILITY_FAILED_NOTICE;
}
