import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { isLoading } from '../../../shared/utils/request.utils';
import { reviewsFeature } from '../../reviews/state/reviews.feature';
import { shopFeature } from '../../shop/state/shop.feature';
import { NextTimeSlot } from '../models/next-time-slot.model';
import { toAreNextTimesMissing, toNextTimeSlots } from '../utils/next-times.utils';
import { homeReducer } from './home.reducer';
import { HomeState, SmsSignupState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectIsSubscribedToSms: MemoizedSelector<object, boolean>;
  selectIsSubscribingSms: MemoizedSelector<object, boolean>;
  selectNextTimeSlots: MemoizedSelector<object, NextTimeSlot[]>;
  selectAreNextTimesMissing: MemoizedSelector<object, boolean>;
  selectAreHeroFactsLoading: MemoizedSelector<object, boolean>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-home`). */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * The home page's open times and the SMS signup, registered at bootstrap because the header and
 * footer link to its sections on every page. Its effects still register with the home route.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectSmsSignup,
    selectNextTimes,
    selectNextTimesStatus,
  }: FeatureSelectors<HomeState>): HomeExtraSelectors => ({
    selectIsSubscribedToSms: createSelector(
      selectSmsSignup,
      (smsSignup: SmsSignupState): boolean => smsSignup.status === RequestStatus.Success,
    ),
    selectIsSubscribingSms: createSelector(
      selectSmsSignup,
      (smsSignup: SmsSignupState): boolean => smsSignup.status === RequestStatus.Pending,
    ),
    selectNextTimeSlots: createSelector(
      selectNextTimes,
      shopFeature.selectTimeZone,
      toNextTimeSlots,
    ),
    selectAreNextTimesMissing: createSelector(
      selectNextTimesStatus,
      selectNextTimes,
      toAreNextTimesMissing,
    ),
    selectAreHeroFactsLoading: createSelector(
      selectNextTimesStatus,
      reviewsFeature.selectIsLoading,
      toAreHeroFactsLoading,
    ),
  }),
});

/** The hero's facts row shows the next open time and the rating, so a placeholder holds it until both have answered. */
function toAreHeroFactsLoading(nextTimesStatus: RequestStatus, isReviewsLoading: boolean): boolean {
  return isLoading(nextTimesStatus) || isReviewsLoading;
}
