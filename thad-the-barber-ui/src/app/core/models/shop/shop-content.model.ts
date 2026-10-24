/** Site content Square doesn't hold, until the home content and reviews slices own it (#37). */
export interface ShopContent {
  reviews: {
    score: number;
    count: number;
    source: string;
  };
}
