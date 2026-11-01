import { readFile } from 'node:fs/promises';
import { Download, Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { testConfirmationIn } from '../../src/testing/test-booking';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { isManagedBookingRequest, saveBookings } from '../support/booking';
import { expect, test } from '../support/fixtures';

/** The `GET /api/bookings/{id}` calls the fixture answers, to check their token. */
function recordBookingLoads(page: Page): Request[] {
  const requests: Request[] = [];
  page.on('request', (request: Request): void => {
    const isBookingLoad: boolean = request.method() === 'GET' && isManagedBookingRequest(new URL(request.url()));
    if (isBookingLoad) {
      requests.push(request);
    }
  });
  return requests;
}

test.describe(
  'manage booking',
  (): void => {
    test(
      'opens a manage link, sends its token in the header only and clears it from the address bar, through a reload',
      async ({ page }: { page: Page; }): Promise<void> => {
        const requests: Request[] = recordBookingLoads(page);

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
        const requests: Request[] = recordBookingLoads(page);
        const tomorrow: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
        await saveBookings(page, [
          testConfirmationIn(7, 'made-up-next-week'),
          testConfirmationIn(-1, 'made-up-yesterday'),
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
      'downloads the appointment as an .ics file',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');
        await expect(page.getByTestId('add-to-calendar')).toBeEnabled();

        const downloadEvent: Promise<Download> = page.waitForEvent('download');
        await page.getByTestId('add-to-calendar').click();
        const download: Download = await downloadEvent;
        const icsFile: string = await readFile(await download.path(), 'utf8');

        expect(download.suggestedFilename()).toBe('appointment.ics');
        expect(icsFile).toContain('BEGIN:VEVENT');
        expect(icsFile).toContain(`SUMMARY:Appointment at ${TEST_SHOP.name}`);
      },
    );

    test(
      'copies the link with a toast',
      async ({ page }: { page: Page; }): Promise<void> => {
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
