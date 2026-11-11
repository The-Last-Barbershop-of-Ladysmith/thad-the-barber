import { RequestStatus } from '../../../shared/models/request.models';
import { ReviewRating } from '../models/review-rating.model';
import { Testimonial } from '../models/testimonial.model';

export interface ReviewsState {
  testimonials: Testimonial[];
  rating: ReviewRating | null;
  loadStatus: RequestStatus;
}

export const initialReviewsState: ReviewsState = {
  testimonials: [],
  rating: null,
  loadStatus: RequestStatus.Idle,
};
