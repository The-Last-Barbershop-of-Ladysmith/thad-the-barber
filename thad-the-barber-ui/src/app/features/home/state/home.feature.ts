import { type MemoizedSelector, createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { type HomeContent } from '../models/home.models';
import { HomeApiActions, HomePageActions } from './home.actions';
import { type HomeState, type RequestStatus, type SmsSignupState, initialHomeState } from './home.state';

/**
 * `createFeature` scopes everything under the `home` key: it generates `selectHomeState`
 * plus one selector per property. The derived selectors below build on those scoped selectors.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: 'home',
  reducer: createReducer(
    initialHomeState,
    on(
      HomePageActions.opened,
      (state: HomeState): HomeState => ({
        ...state,
        contentStatus: 'pending',
      }),
    ),
    on(
      HomeApiActions.contentLoaded,
      (
        state: HomeState,
        { content }: { content: HomeContent; },
      ): HomeState => ({
        ...state,
        ...content,
        contentStatus: 'success',
      }),
    ),
    on(
      HomeApiActions.contentLoadFailed,
      (state: HomeState): HomeState => ({
        ...state,
        contentStatus: 'error',
      }),
    ),
    on(
      HomePageActions.smsSignupSubmitted,
      (
        state: HomeState,
        { phone }: { phone: string; },
      ): HomeState => ({
        ...state,
        smsSignup: {
          status: 'pending',
          phone,
          error: null,
        },
      }),
    ),
    on(
      HomeApiActions.smsSignupSucceeded,
      (
        state: HomeState,
        { phone }: { phone: string; },
      ): HomeState => ({
        ...state,
        smsSignup: {
          status: 'success',
          phone,
          error: null,
        },
      }),
    ),
    on(
      HomeApiActions.smsSignupFailed,
      (
        state: HomeState,
        { error }: { error: string; },
      ): HomeState => ({
        ...state,
        smsSignup: {
          ...state.smsSignup,
          status: 'error',
          error,
        },
      }),
    ),
  ),
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
