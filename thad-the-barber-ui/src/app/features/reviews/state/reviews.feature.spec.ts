import { RequestStatus } from '../../../shared/models/request.models';
import { reviewsFeature, reviewsFeatureKey } from './reviews.feature';
import { ReviewsState, initialReviewsState } from './reviews.state';

describe(
  'selectIsLoading',
  (): void => {
    it.each([
      [RequestStatus.Idle, true],
      [RequestStatus.Pending, true],
      [RequestStatus.Success, false],
      [RequestStatus.Error, false],
    ])(
      'for a load status of %s is %s, so a placeholder holds the reviews until they answer',
      (loadStatus: RequestStatus, isLoading: boolean): void => {
        const state: ReviewsState = { ...initialReviewsState, loadStatus };

        expect(reviewsFeature.selectIsLoading({ [reviewsFeatureKey]: state })).toBe(isLoading);
      },
    );
  },
);
