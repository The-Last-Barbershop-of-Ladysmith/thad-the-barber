export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  source: string;
  rating: number;
}

/** The Google listing's rating and review count, shown only when the reviews file carries them. */
export interface ReviewRating {
  score: number;
  count: number;
  url: string | null;
}

export interface HomeContent {
  testimonials: Testimonial[];
  rating: ReviewRating | null;
}
