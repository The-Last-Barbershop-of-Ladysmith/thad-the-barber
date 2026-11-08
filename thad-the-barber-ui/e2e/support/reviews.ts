import { Route } from '@playwright/test';
import { HomeContent } from '../../src/app/features/home/models/home.models';
import { servedEnvironment } from './served-environment';

export const REVIEWS_URL: string = `${servedEnvironment.apiBaseUrl}/reviews`;

/** What the API makes of a made-up reviews file: two testimonials and a listing rating. */
export const TEST_REVIEWS: HomeContent = {
  testimonials: [
    {
      id: 'review-0',
      quote: 'E2E first review',
      author: 'E2E Avery',
      source: 'Customer review',
      rating: 5,
    },
    {
      id: 'review-1',
      quote: 'E2E second review',
      author: 'E2E Jordan',
      source: 'Customer review',
      rating: 4,
    },
  ],
  rating: {
    score: 4.5,
    count: 12,
    url: 'https://example.test/e2e-listing',
  },
};

export function isReviewsRequest(url: URL): boolean {
  return url.href === REVIEWS_URL;
}

export async function fulfillReviews(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_REVIEWS });
}
