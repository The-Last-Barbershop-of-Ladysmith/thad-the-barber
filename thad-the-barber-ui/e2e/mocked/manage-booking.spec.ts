import { readFile } from 'node:fs/promises';
import { Download, Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { ManagedBooking } from '../../src/app/features/booking/dtos/managed-booking.dto';
import { testConfirmationIn } from '../../src/testing/test-booking';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { isCancelRequest, isManagedBookingRequest, isRescheduleRequest, saveBookings } from '../support/booking';
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

    test(
      'cancels after asking, then shows the booking as cancelled with a toast',
      async ({ page }: { page: Page; }): Promise<void> => {
        const cancels: Request[] = [];
        await page.route(isCancelRequest, async (route: Route): Promise<void> => {
          cancels.push(route.request());
          await route.fulfill({ json: toManagedBooking(route, { isCancelled: true, canChange: false }) });
        });
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await page.getByTestId('cancel-booking').click();
        const dialog: Locator = page.locator('.p-confirmdialog');
        await expect(dialog).toBeVisible();
        await expectNoA11yViolations(page);
        await dialog.locator('.p-confirmdialog-accept-button').click();

        await expect(page.getByTestId('booking-status')).toBeVisible();
        await expect(page.locator('.p-toast-message-success')).toBeVisible();
        await expect(page.getByTestId('cancel-booking')).toHaveCount(0);
        expect(await cancels[0]?.headerValue('x-manage-token')).toBe('made-up-link-token');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'keeps the booking and shows an inline error with a retry when the cancel fails',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isCancelRequest, (route: Route): Promise<void> => route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          json: {
            type: 'about:blank',
            title: 'Made-up title',
            status: 500,
            code: 'internal_error',
          },
        }));
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await page.getByTestId('cancel-booking').click();
        await page.locator('.p-confirmdialog-accept-button').click();

        const cancelNotice: Locator = page.getByTestId('cancel-notice');
        await expect(cancelNotice).toBeVisible();
        await expect(cancelNotice.getByTestId('notice-retry')).toBeVisible();
        await expect(page.getByTestId('booking-status')).toHaveCount(0);
        await expect(page.getByTestId('cancel-booking')).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'moves the booking to a new time from the date and time steps, then shows it with a toast',
      async ({ page }: { page: Page; }): Promise<void> => {
        const moves: Request[] = [];
        await page.route(isRescheduleRequest, async (route: Route): Promise<void> => {
          moves.push(route.request());
          const { startAt }: { startAt: string; } = route.request().postDataJSON() as { startAt: string; };
          await route.fulfill({ json: toManagedBooking(route, { startAt }) });
        });
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await page.getByTestId('reschedule').click();
        await expect(page.getByTestId('reschedule-picker')).toBeVisible();
        await page.getByTestId('date-list').locator('[role="button"]').first().click();
        await page.getByTestId('time-list').locator('[role="button"]').first().click();
        await expectNoA11yViolations(page);
        await page.getByTestId('confirm-reschedule').click();

        await expect(page.locator('.p-toast-message-success')).toBeVisible();
        await expect(page.getByTestId('reschedule-picker')).toHaveCount(0);
        const { startAt }: { startAt: string; } = moves[0]?.postDataJSON() as { startAt: string; };
        expect(startAt).toMatch(/T20:00:00Z$/);
        expect(await moves[0]?.headerValue('x-manage-token')).toBe('made-up-link-token');
      },
    );

    test(
      'shows a past booking with no way to change it',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isManagedBookingRequest, (route: Route): Promise<void> =>
          route.fulfill({ json: toManagedBooking(route, { canChange: false }) }));

        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await expect(page.getByTestId('booking-status')).toBeVisible();
        await expect(page.getByTestId('reschedule')).toHaveCount(0);
        await expect(page.getByTestId('cancel-booking')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );
  },
);

/** The booking the request names, upcoming and changeable a day from now unless `changes` say otherwise. */
function toManagedBooking(route: Route, changes: Partial<ManagedBooking>): ManagedBooking {
  const id: string = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[3] ?? '');
  return {
    id,
    startAt: testConfirmationIn(1, id).startAt,
    isCancelled: false,
    canChange: true,
    ...changes,
  };
}
