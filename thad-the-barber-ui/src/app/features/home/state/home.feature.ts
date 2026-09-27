import { type MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { homeReducer } from './home.reducer';
import { type RequestStatus, type SmsSignupState } from './home.state';

/**
 * `createFeature` scopes everything under the `home` key: it generates `selectHomeState`
 * plus one selector per property. The derived selectors below build on those scoped selectors.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: 'home',
  reducer: homeReducer,
});

export const {
  selectHomeState,
  selectAnnouncements,
  selectTestimonials,
  selectGallery,
  selectContentStatus,
  selectSmsSignup,
}: typeof homeFeature = homeFeature;

export const selectIsSubscribed: MemoizedSelector<object, boolean> = createSelector(
  selectSmsSignup,
  (signup: SmsSignupState): boolean => signup.status === 'success',
);

export const selectIsSubscribing: MemoizedSelector<object, boolean> = createSelector(
  selectSmsSignup,
  (signup: SmsSignupState): boolean => signup.status === 'pending',
);

export const selectContentLoading: MemoizedSelector<object, boolean> = createSelector(
  selectContentStatus,
  (status: RequestStatus): boolean => status === 'pending',
);
