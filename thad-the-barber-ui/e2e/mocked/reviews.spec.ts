import { Locator, Page, Request, Route } from '@playwright/test';
import { Testimonial } from '../../src/app/features/home/models/home.models';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { collectPageErrors } from '../support/page-errors';
import { REVIEWS_URL, TEST_REVIEWS, isReviewsRequest } from '../support/reviews';

const HIDING_RESPONSES: Record<string, Parameters<Route['fulfill']>[0]> = {
  'a failed request': { status: 503 },
  'nothing to show': { json: { testimonials: [], rating: null } },
  'a body that does not parse': { body: '{ "testimonials": [', contentType: 'application/json' },
};

test.describe(
  'reviews',
  (): void => {
    test(
      'shows every review the API returns',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/#reviews');

        const authors: Locator = page.getByTestId('testimonials').locator('.author-name');
        await expect(authors).toHaveCount(TEST_REVIEWS.testimonials.length);
        await expect(authors).toHaveText(TEST_REVIEWS.testimonials.map((review: Testimonial): string => review.author));
        await expectNoA11yViolations(page);
      },
    );

    test(
      'shows the listing rating in the hero and the reviews section',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        for (const testId of ['hero-rating', 'reviews-rating']) {
          const rating: Locator = page.getByTestId(testId);
          await expect(rating).toContainText(String(TEST_REVIEWS.rating?.score));
          await expect(rating).toContainText(String(TEST_REVIEWS.rating?.count));
        }
      },
    );

    test(
      'shows no rating when the API returns none',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(REVIEWS_URL, (route: Route): Promise<void> =>
          route.fulfill({ json: { ...TEST_REVIEWS, rating: null } }));

        await page.goto('/');

        await expect(page.getByTestId('testimonials')).toBeAttached();
        await expect(page.getByTestId('hero-rating')).toHaveCount(0);
        await expect(page.getByTestId('reviews-rating')).toHaveCount(0);
      },
    );

    const REVIEWS_REQUEST_CASES: [string, (page: Page) => Locator, number][] = [
      [
        '/',
        (page: Page): Locator => page.getByTestId('testimonials'),
        1,
      ],
      [
        '/book',
        (page: Page): Locator => page.getByRole('heading', { level: 1 }),
        0,
      ],
    ];
    for (const [
      path,
      readyLocator,
      expectedRequests,
    ] of REVIEWS_REQUEST_CASES) {
      test(
        `makes ${expectedRequests} reviews request(s) on ${path}`,
        async ({ page }: { page: Page; }): Promise<void> => {
          const reviewsRequests: string[] = [];
          page.on('request', (request: Request): void => {
            if (isReviewsRequest(new URL(request.url()))) {
              reviewsRequests.push(request.url());
            }
          });

          await page.goto(path);
          await expect(readyLocator(page)).toBeAttached();

          expect(reviewsRequests).toHaveLength(expectedRequests);
        },
      );
    }

    for (const [outage, response] of Object.entries(HIDING_RESPONSES)) {
      test(
        `hides the reviews section and its nav link for ${outage}, and the rest of the page still works`,
        async ({ page, isMobile }: { page: Page; isMobile: boolean; }): Promise<void> => {
          const pageErrors: Error[] = collectPageErrors(page);
          await page.route(REVIEWS_URL, (route: Route): Promise<void> => route.fulfill(response));
          const reviewsResponse: Promise<unknown> = page.waitForResponse(REVIEWS_URL);

          await page.goto('/');
          await reviewsResponse;

          await expect(page.locator('#visit')).toBeVisible();
          await expect(page.getByTestId('testimonials')).toHaveCount(0);
          if (isMobile) {
            await page.getByTestId('menu-toggle').click();
          }
          const nav: Locator = page.getByTestId(isMobile ? 'drawer-nav' : 'header-nav');
          await expect(nav.locator('a[href="/#visit"]')).toBeVisible();
          await expect(nav.locator('a[href="/#reviews"]')).toHaveCount(0);
          expect(pageErrors).toEqual([]);
        },
      );
    }
  },
);
