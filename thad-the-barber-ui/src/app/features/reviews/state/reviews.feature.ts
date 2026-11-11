import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { isLoading } from '../../../shared/utils/request.utils';
import { reviewsReducer } from './reviews.reducer';
import { ReviewsState } from './reviews.state';

/** Selectors derived from the generated ones; exposed on `reviewsFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type ReviewsExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
};

export const reviewsFeatureKey: 'reviews' = 'reviews' as const;

/**
 * The testimonials and the Google listing's rating from `GET /api/reviews`. Registered with its effects on the home
 * route, the only page that shows them, so no other page requests them. Not saved, so an edited review never comes
 * back from storage.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const reviewsFeature = createFeature({
  name: reviewsFeatureKey,
  reducer: reviewsReducer,
  extraSelectors: ({ selectLoadStatus }: FeatureSelectors<ReviewsState>): ReviewsExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      isLoading,
    ),
  }),
});
