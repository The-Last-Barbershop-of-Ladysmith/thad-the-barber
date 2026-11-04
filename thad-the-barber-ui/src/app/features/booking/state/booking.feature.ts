import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { Notice } from '../../../shared/models/notice.model';
import { AVAILABILITY_FAILED_NOTICE } from '../config/booking-notices';
import { bookingReducer } from './booking.reducer';
import { BookingState } from './booking.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type BookingExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectIsSubmitting: MemoizedSelector<object, boolean>;
  /** The booking or move went through and the page is leaving: nothing more is sent, and leaving doesn't ask. */
  selectIsSubmitDone: MemoizedSelector<object, boolean>;
  selectNotice: MemoizedSelector<object, Notice | null>;
};

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: 'booking',
  reducer: bookingReducer,
  extraSelectors: ({
    selectLoadStatus,
    selectSubmitStatus,
  }: FeatureSelectors<BookingState>): BookingExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      toIsLoading,
    ),
    selectIsSubmitting: createSelector(
      selectSubmitStatus,
      toIsLoading,
    ),
    selectIsSubmitDone: createSelector(
      selectSubmitStatus,
      toIsSubmitDone,
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

function toIsSubmitDone(submitStatus: RequestStatus): boolean {
  return submitStatus === RequestStatus.Success;
}

function toAvailabilityNotice(loadStatus: RequestStatus): Notice | null {
  return loadStatus === RequestStatus.Error ? AVAILABILITY_FAILED_NOTICE : null;
}
