import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { ReviewRating } from '../models/review-rating.model';
import { Testimonial } from '../models/testimonial.model';
import * as ReviewsActions from './reviews.actions';
import { ReviewsState, initialReviewsState } from './reviews.state';

export const reviewsReducer: ActionReducer<ReviewsState> = createReducer(
  initialReviewsState,
  on(
    ReviewsActions.ReviewsRequest,
    (state: ReviewsState): ReviewsState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    ReviewsActions.ReviewsRequestSuccess,
    (
      _state: ReviewsState,
      { testimonials, rating }: { testimonials: Testimonial[]; rating: ReviewRating | null; },
    ): ReviewsState => ({
      testimonials,
      rating,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    ReviewsActions.ReviewsRequestFailure,
    (state: ReviewsState): ReviewsState => ({
      ...state,
      loadStatus: RequestStatus.Error,
    }),
  ),
);
