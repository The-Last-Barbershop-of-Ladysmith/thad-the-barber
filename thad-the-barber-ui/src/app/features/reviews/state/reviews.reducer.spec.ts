import { RequestStatus } from '../../../shared/models/request.models';
import { ReviewRating } from '../models/review-rating.model';
import { Testimonial } from '../models/testimonial.model';
import * as ReviewsActions from './reviews.actions';
import { reviewsReducer } from './reviews.reducer';
import { ReviewsState, initialReviewsState } from './reviews.state';

const testimonials: Testimonial[] = [
  {
    id: 'review-0',
    quote: 'Made-up text',
    author: 'Avery Testwell',
    source: 'Customer review',
    rating: 5,
  },
];

const rating: ReviewRating = {
  score: 4.5,
  count: 12,
  url: null,
};

describe(
  'reviews reducer',
  (): void => {
    it(
      'keeps the reviews on screen while a new request runs, so a revisit does not flash a placeholder',
      (): void => {
        const before: ReviewsState = {
          testimonials,
          rating,
          loadStatus: RequestStatus.Success,
        };

        const state: ReviewsState = reviewsReducer(before, ReviewsActions.ReviewsRequest());

        expect(state).toEqual({
          testimonials,
          rating,
          loadStatus: RequestStatus.Pending,
        });
      },
    );

    it(
      'replaces the reviews and the rating with the loaded ones',
      (): void => {
        const before: ReviewsState = {
          testimonials: [],
          rating,
          loadStatus: RequestStatus.Pending,
        };

        const state: ReviewsState = reviewsReducer(
          before,
          ReviewsActions.ReviewsRequestSuccess({ testimonials, rating: null }),
        );

        expect(state).toEqual({
          testimonials,
          rating: null,
          loadStatus: RequestStatus.Success,
        });
      },
    );

    it(
      'marks a failed load',
      (): void => {
        const state: ReviewsState = reviewsReducer(initialReviewsState, ReviewsActions.ReviewsRequestFailure());

        expect(state.loadStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
