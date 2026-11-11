import { createAction, props } from '@ngrx/store';
import { ReviewRating } from '../models/review-rating.model';
import { Testimonial } from '../models/testimonial.model';

export enum ReviewsActionTypes {
  ReviewsRequest = '[Reviews] Reviews Requested',
  ReviewsRequestSuccess = '[Reviews API] Reviews Request Success',
  ReviewsRequestFailure = '[Reviews API] Reviews Request Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ReviewsRequest = createAction(
  ReviewsActionTypes.ReviewsRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ReviewsRequestSuccess = createAction(
  ReviewsActionTypes.ReviewsRequestSuccess,
  props<{ testimonials: Testimonial[]; rating: ReviewRating | null; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ReviewsRequestFailure = createAction(
  ReviewsActionTypes.ReviewsRequestFailure,
);
