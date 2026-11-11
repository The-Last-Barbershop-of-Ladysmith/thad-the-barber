import { ReviewRating } from '../models/review-rating.model';
import { Testimonial } from '../models/testimonial.model';

/** `GET /api/reviews`: the testimonials and the Google listing's rating, when the reviews file carries them. */
export interface ReviewsResponse {
  testimonials: Testimonial[];
  rating: ReviewRating | null;
}
