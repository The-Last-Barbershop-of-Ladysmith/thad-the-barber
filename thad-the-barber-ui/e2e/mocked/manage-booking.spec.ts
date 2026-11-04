import { readFile } from 'node:fs/promises';
import { Download, Locator, Page, Request, Route } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { isBookingActionRequest, isManagedBookingRequest, toManagedBooking } from '../support/booking';
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
        await page.route(isBookingActionRequest('cancel'), async (route: Route): Promise<void> => {
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
        await page.route(isBookingActionRequest('cancel'), (route: Route): Promise<void> => route.fulfill({
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
      'moves the booking on the booking page (day and time, no details), then returns to it with a toast',
      async ({ page }: { page: Page; }): Promise<void> => {
        const moves: Request[] = [];
        await page.route(isBookingActionRequest('reschedule'), async (route: Route): Promise<void> => {
          moves.push(route.request());
          const { startAt }: { startAt: string; } = route.request().postDataJSON() as { startAt: string; };
          await route.fulfill({ json: toManagedBooking(route, { startAt }) });
        });
        await page.goto('/book/manage/made-up-booking#t=made-up-link-token');

        await page.getByTestId('reschedule').click();
        await expect(page).toHaveURL(/\/book\/manage\/made-up-booking\/reschedule$/);
        await page.getByTestId('date-picker')
          .locator('td:not(.p-datepicker-other-month) .p-datepicker-day:not(.p-disabled)')
          .first()
          .click();
        await page.getByTestId('time-list').locator('[role="button"]').first().click();
        await expect(page.locator('#booking-name')).toHaveCount(0);
        await expectNoA11yViolations(page);
        await page.getByTestId('confirm-booking').click();

        await expect(page).toHaveURL(/\/book\/manage\/made-up-booking$/);
        await expect(page.locator('.p-toast-message-success')).toBeVisible();
        await expect(page.getByTestId('managed-booking')).toBeVisible();
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
