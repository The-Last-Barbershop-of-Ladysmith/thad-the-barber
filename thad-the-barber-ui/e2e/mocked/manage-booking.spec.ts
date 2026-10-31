import { Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { encodeBase64 } from '../../src/app/shared/utils/base64.utils';
import { testConfirmation } from '../../src/testing/test-booking';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { fulfillManagedBooking, isManagedBookingRequest } from '../support/booking';
import { expect, test } from '../support/fixtures';

const ONE_DAY_MS: number = 24 * 60 * 60 * 1000;

function bookingIn(days: number, id: string): BookingConfirmation {
  return testConfirmation(new Date(Date.now() + days * ONE_DAY_MS).toISOString(), id);
}

/** Answers every `GET /api/bookings/{id}` as the fixture does, keeping the requests to check their token. */
async function serveBookings(page: Page): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(isManagedBookingRequest, (route: Route): Promise<void> => {
    requests.push(route.request());
    return fulfillManagedBooking(route);
  });
  return requests;
}

async function saveBookings(page: Page, savedConfirmations: BookingConfirmation[]): Promise<void> {
  const encoded: string = encodeBase64(JSON.stringify({ savedConfirmations }));
  await page.addInitScript((value: string): void => {
    localStorage.setItem('ttb-booking', value);
  }, encoded);
}

test.describe(
  'manage booking',
  (): void => {
    test(
      'opens a manage link, sends its token in the header only and clears it from the address bar, through a reload',
      async ({ page }: { page: Page; }): Promise<void> => {
        const requests: Request[] = await serveBookings(page);

        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await expect(page.getByTestId('managed-booking')).toBeVisible();
        await expect(page).toHaveURL(/\/book\/manage\/made-up-booking$/);
        await expect(page.getByTestId('add-to-calendar')).toBeEnabled();
        await expectNoA11yViolations(page);

        await page.reload();

        await expect(page.getByTestId('managed-booking')).toBeVisible();
        expect(requests).toHaveLength(2);
        for (const request of requests) {
          expect(await request.headerValue('x-manage-token')).toBe('made-up-link-token');
          expect(request.url()).not.toContain('made-up-link-token');
        }
      },
    );

    test(
      "shows a booking the API can't find as not found",
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isManagedBookingRequest, (route: Route): Promise<void> => route.fulfill({
          status: 404,
          contentType: 'application/problem+json',
          json: {
            type: 'about:blank',
            title: 'Made-up title',
            status: 404,
            code: 'booking_not_found',
          },
        }));

        await page.goto('/book/manage/made-up-booking#t=made-up-wrong-token');

        await expect(page.getByTestId('booking-notice')).toBeVisible();
        await expect(page.getByTestId('managed-booking')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      "lists this device's upcoming bookings, soonest first, and opens one with its saved token",
      async ({ page }: { page: Page; }): Promise<void> => {
        const requests: Request[] = await serveBookings(page);
        const tomorrow: BookingConfirmation = bookingIn(1, 'made-up-tomorrow');
        await saveBookings(page, [
          bookingIn(7, 'made-up-next-week'),
          bookingIn(-1, 'made-up-yesterday'),
          tomorrow,
        ]);

        await page.goto('/book/manage');

        const savedBookings: Locator = page.getByTestId('saved-booking');
        await expect(savedBookings).toHaveCount(2);
        await expect(savedBookings.first()).toHaveAttribute('href', '/book/manage/made-up-tomorrow');
        await expect(page.getByTestId('all-bookings-on-square')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expectNoA11yViolations(page);

        await savedBookings.first().click();

        await expect(page.getByTestId('managed-booking')).toBeVisible();
        expect(await requests[0]?.headerValue('x-manage-token')).toBe(tomorrow.manageToken);
      },
    );

    test(
      'copies the link with a toast',
      async ({ page }: { page: Page; }): Promise<void> => {
        await serveBookings(page);
        // Browsers differ on clipboard permissions in tests; the page only needs writeText to succeed.
        await page.addInitScript((): void => {
          Object.defineProperty(
            navigator,
            'clipboard',
            { value: { writeText: (): Promise<void> => Promise.resolve() } },
          );
        });
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await page.getByTestId('copy-link').click();

        await expect(page.locator('.p-toast-message-success')).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );
  },
);
