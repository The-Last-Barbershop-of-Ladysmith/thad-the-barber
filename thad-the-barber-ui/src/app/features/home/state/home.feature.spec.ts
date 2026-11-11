import { RequestStatus } from '../../../shared/models/request.models';
import { reviewsFeatureKey } from '../../reviews/state/reviews.feature';
import { initialReviewsState } from '../../reviews/state/reviews.state';
import { homeFeature, homeFeatureKey } from './home.feature';
import { initialHomeState } from './home.state';

describe(
  'selectAreHeroFactsLoading',
  (): void => {
    function isLoadingFor(nextTimesStatus: RequestStatus, reviewsStatus: RequestStatus): boolean {
      return homeFeature.selectAreHeroFactsLoading({
        [homeFeatureKey]: {
          ...initialHomeState,
          nextTimesStatus,
        },
        [reviewsFeatureKey]: {
          ...initialReviewsState,
          loadStatus: reviewsStatus,
        },
      });
    }

    it.each([
      [RequestStatus.Idle, RequestStatus.Success],
      [RequestStatus.Pending, RequestStatus.Success],
      [RequestStatus.Success, RequestStatus.Idle],
      [RequestStatus.Success, RequestStatus.Pending],
      [RequestStatus.Idle, RequestStatus.Idle],
    ])(
      'is true while the open times (%s) or the reviews (%s) have not answered',
      (nextTimesStatus: RequestStatus, reviewsStatus: RequestStatus): void => {
        expect(isLoadingFor(nextTimesStatus, reviewsStatus)).toBe(true);
      },
    );

    it.each([
      [RequestStatus.Success, RequestStatus.Success],
      [RequestStatus.Error, RequestStatus.Success],
      [RequestStatus.Success, RequestStatus.Error],
      [RequestStatus.Error, RequestStatus.Error],
    ])(
      'is false once both have loaded or failed (%s, %s)',
      (nextTimesStatus: RequestStatus, reviewsStatus: RequestStatus): void => {
        expect(isLoadingFor(nextTimesStatus, reviewsStatus)).toBe(false);
      },
    );
  },
);
