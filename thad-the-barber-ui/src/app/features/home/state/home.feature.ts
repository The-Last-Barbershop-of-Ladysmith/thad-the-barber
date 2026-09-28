import { type MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { type FeatureSelectors } from '../../../shared/models/ngrx.models';
import { homeReducer } from './home.reducer';
import { type HomeState, type RequestStatus, type SmsSignupState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectIsSubscribed: MemoizedSelector<object, boolean>;
  selectIsSubscribing: MemoizedSelector<object, boolean>;
  selectContentLoading: MemoizedSelector<object, boolean>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-home`). */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * `createFeature` scopes everything under the `home` key: it generates `selectHomeState`
 * plus one selector per property, and `extraSelectors` adds the derived ones built on those.
 * Consumers import `homeFeature` and read every selector from it.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectSmsSignup,
    selectContentStatus,
  }: FeatureSelectors<HomeState>): HomeExtraSelectors => ({
    selectIsSubscribed: createSelector(
      selectSmsSignup,
      (signup: SmsSignupState): boolean => signup.status === 'success',
    ),
    selectIsSubscribing: createSelector(
      selectSmsSignup,
      (signup: SmsSignupState): boolean => signup.status === 'pending',
    ),
    selectContentLoading: createSelector(
      selectContentStatus,
      (status: RequestStatus): boolean => status === 'pending',
    ),
  }),
});
