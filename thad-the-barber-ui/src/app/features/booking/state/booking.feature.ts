import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { Notice } from '../../../shared/models/notice.model';
import { AVAILABILITY_FAILED_NOTICE, NO_OPEN_DAYS_NOTICE } from '../config/booking-notices';
import { AvailableDay } from '../dtos/available-day.dto';
import { bookingReducer } from './booking.reducer';
import { BookingState } from './booking.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type BookingExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectIsSubmitting: MemoizedSelector<object, boolean>;
  /** The booking or move went through and the page is leaving: nothing more is sent, and leaving doesn't ask. */
  selectIsSubmitDone: MemoizedSelector<object, boolean>;
  /** Each open day of the month in view ("2026-10-03") and how many open times it has. */
  selectOpenTimeCounts: MemoizedSelector<object, Map<string, number>>;
  selectNotice: MemoizedSelector<object, Notice | null>;
};

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const bookingFeature = createFeature({
  name: 'booking',
  reducer: bookingReducer,
  extraSelectors: ({
    selectLoadStatus,
    selectSubmitStatus,
    selectAvailableDays,
  }: FeatureSelectors<BookingState>): BookingExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      toIsPending,
    ),
    selectIsSubmitting: createSelector(
      selectSubmitStatus,
      toIsPending,
    ),
    selectIsSubmitDone: createSelector(
      selectSubmitStatus,
      toIsSubmitDone,
    ),
    selectOpenTimeCounts: createSelector(
      selectAvailableDays,
      toOpenTimeCounts,
    ),
    selectNotice: createSelector(
      selectLoadStatus,
      selectAvailableDays,
      toAvailabilityNotice,
    ),
  }),
});

function toIsPending(requestStatus: RequestStatus): boolean {
  return requestStatus === RequestStatus.Pending;
}

function toIsSubmitDone(submitStatus: RequestStatus): boolean {
  return submitStatus === RequestStatus.Success;
}

function toOpenTimeCounts(availableDays: AvailableDay[]): Map<string, number> {
  return new Map(availableDays.map((availableDay: AvailableDay): [string, number] =>
    [availableDay.date, availableDay.times.length]));
}

/** Square leaves out closed and full days, so a month can load with none. */
function toAvailabilityNotice(loadStatus: RequestStatus, availableDays: AvailableDay[]): Notice | null {
  if (loadStatus === RequestStatus.Error) {
    return AVAILABILITY_FAILED_NOTICE;
  }
  return loadStatus === RequestStatus.Success && availableDays.length === 0 ? NO_OPEN_DAYS_NOTICE : null;
}
