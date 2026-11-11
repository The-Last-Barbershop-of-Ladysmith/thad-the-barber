/** The Google listing's rating and review count, shown only when the reviews file carries them. */
export interface ReviewRating {
  score: number;
  count: number;
  url: string | null;
}
