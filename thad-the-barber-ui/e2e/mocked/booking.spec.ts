import { Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { BookingRequest } from '../../src/app/features/booking/dtos/booking-request.dto';
import { ProblemCode } from '../../src/app/shared/models/problem-code.model';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { expectNoA11yViolations } from '../support/axe';
import { fulfillAvailability, isAvailabilityRequest, isBookingRequest } from '../support/booking';
import { expect, test } from '../support/fixtures';
import { fulfillSession, isSessionRequest } from '../support/session';

const CUSTOMER_PHONE: string = '5405550123';

function confirm(request: Request): BookingConfirmation {
  const body: BookingRequest = request.postDataJSON() as BookingRequest;
  return {
    id: 'made-up-booking',
    startAt: body.startAt,
    manageToken: 'made-up-manage-token',
  };
}

async function problem(
  route: Route,
  status: number,
  code: string,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/problem+json',
    json: {
      type: 'about:blank',
      title: 'Made-up title',
      status,
      code,
    },
  });
}

function openDays(page: Page): Locator {
  return page.getByTestId('date-list').locator('[role="button"]');
}

/** The shop has loaded, so the page can show times and a kept booking. */
async function waitForShop(page: Page): Promise<void> {
  await expect(page.locator(`a[href="tel:${TEST_SHOP.phone}"]`).first()).toBeAttached();
}

/** Picks the first open day and time and fills in the made-up customer. */
async function fillInBooking(page: Page): Promise<void> {
  await openDays(page).first().click();
  await page.getByTestId('time-list').locator('[role="button"]').first().click();
  await fillInDetails(page);
}

async function fillInDetails(page: Page): Promise<void> {
  await page.locator('#booking-name').fill('Jordan Customer');
  const phone: Locator = page.locator('#booking-phone');
  // InputMask redraws its buffer on a timer after focus, which can wipe a value filled too soon.
  await expect(async (): Promise<void> => {
    await phone.fill(CUSTOMER_PHONE);
    await expect(phone).toHaveValue('(540) 555-0123', { timeout: 1_000 });
  }).toPass();
}

async function book(page: Page): Promise<void> {
  await fillInBooking(page);
  await page.getByTestId('confirm-booking').click();
}

test.describe(
  'booking',
  (): void => {
    test(
      'books the first open time with the session token and an E.164 phone',
      async ({ page }: { page: Page; }): Promise<void> => {
        const bookings: Request[] = [];
        await page.route(isBookingRequest, async (route: Route): Promise<void> => {
          bookings.push(route.request());
          await route.fulfill({ status: 201, json: confirm(route.request()) });
        });

        await page.goto('/book');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoA11yViolations(page);
        await book(page);

        await expect(page).toHaveURL(/\/book\/manage\/made-up-booking$/);
        await expect(page.getByTestId('booking-confirmation')).toBeVisible();
        await expect(page.getByTestId('manage-link')).toHaveValue(/\/book\/manage\/made-up-booking#t=made-up-manage-token$/);
        await expectNoA11yViolations(page);
        const [booking]: Request[] = bookings;
        const body: BookingRequest = booking?.postDataJSON() as BookingRequest;
        expect(await booking?.headerValue('authorization')).toBe('Bearer e2e-session-jwt');
        expect(body.startAt).toMatch(/T20:00:00Z$/);
        expect(body.phone).toBe(`+1${CUSTOMER_PHONE}`);
      },
    );

    test(
      'keeps nothing about the booking on the device',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isBookingRequest, (route: Route): Promise<void> =>
          route.fulfill({ status: 201, json: confirm(route.request()) }));
        await page.goto('/book');
        await book(page);
        await expect(page.getByTestId('booking-confirmation')).toBeVisible();

        const storedKeys: string[] = await page.evaluate((): string[] => Object.keys(localStorage));
        expect(storedKeys).not.toContain('ttb-booking');
      },
    );

    test(
      "sends anyone already booked to Square's booking site, in a new tab",
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await waitForShop(page);

        const manageBookings: Locator = page.getByTestId('manage-bookings-link');
        await expect(manageBookings).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect(manageBookings).toHaveAttribute('target', '_blank');
      },
    );

    test(
      'shows the open days loading until they arrive',
      async ({ page }: { page: Page; }): Promise<void> => {
        let release: () => void = (): void => undefined;
        const released: Promise<void> = new Promise<void>((resolve: () => void): void => {
          release = resolve;
        });
        await page.route(isAvailabilityRequest, async (route: Route): Promise<void> => {
          await released;
          await fulfillAvailability(route);
        });

        await page.goto('/book');

        const loading: Locator = page.getByTestId('dates-loading');
        await expect(loading).toBeVisible();
        await expect(openDays(page)).toHaveCount(0);
        await expectNoA11yViolations(page);
        release();

        await expect(loading).toHaveCount(0);
        await expect(openDays(page).first()).toBeVisible();
      },
    );

    test(
      'gets a new session token and books once when the API rejects the old one',
      async ({ page }: { page: Page; }): Promise<void> => {
        let sessions: number = 0;
        await page.route(isSessionRequest, async (route: Route): Promise<void> => {
          sessions++;
          await fulfillSession(route);
        });
        const keys: string[] = [];
        await page.route(isBookingRequest, async (route: Route): Promise<void> => {
          keys.push((route.request().postDataJSON() as BookingRequest).idempotencyKey);
          if (keys.length === 1) {
            await problem(
              route,
              401,
              'unauthorized',
            );
            return;
          }
          await route.fulfill({ status: 201, json: confirm(route.request()) });
        });

        await page.goto('/book');
        await book(page);

        await expect(page.getByTestId('booking-confirmation')).toBeVisible();
        expect(sessions).toBe(2);
        expect(keys).toHaveLength(2);
        expect(new Set(keys).size).toBe(1);
      },
    );

    test(
      'warns that the time was taken and takes it off the open times, without reloading them',
      async ({ page }: { page: Page; }): Promise<void> => {
        let availabilityLoads: number = 0;
        await page.route(isAvailabilityRequest, async (route: Route): Promise<void> => {
          availabilityLoads++;
          await fulfillAvailability(route);
        });
        await page.route(isBookingRequest, (route: Route): Promise<void> => problem(
          route,
          409,
          ProblemCode.SlotUnavailable,
        ));

        await page.goto('/book');
        await openDays(page).first().click();
        const openTimes: Locator = page.getByTestId('time-list').locator('[role="button"]');
        await openTimes.first().waitFor();
        const openTimeCount: number = await openTimes.count();
        await openTimes.first().click();
        await fillInDetails(page);
        await page.getByTestId('confirm-booking').click();

        const notice: Locator = page.getByTestId('booking-notice');
        await expect(notice).toHaveClass(/p-message-warn/);
        await expect(notice.getByTestId('notice-booking-site')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect(openTimes).toHaveCount(openTimeCount - 1);
        expect(availabilityLoads).toBe(1);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'offers the shop phone and the Square booking site when the booking limit is reached',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isBookingRequest, (route: Route): Promise<void> => problem(
          route,
          409,
          ProblemCode.BookingLimit,
        ));

        await page.goto('/book');
        await book(page);

        const notice: Locator = page.getByTestId('booking-notice');
        await expect(notice).toHaveClass(/p-message-warn/);
        await expect(notice.getByTestId('notice-call')).toHaveAttribute('href', `tel:${TEST_SHOP.phone}`);
        await expect(notice.getByTestId('notice-text')).toHaveAttribute('href', `sms:${TEST_SHOP.phone}`);
        await expect(notice.getByTestId('notice-booking-site')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'offers the Square booking site and no way to confirm when the bot check fails',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isSessionRequest, (route: Route): Promise<void> => problem(
          route,
          403,
          ProblemCode.BotCheckFailed,
        ));

        await page.goto('/book');

        const botCheck: Locator = page.getByTestId('bot-check-failed');
        await expect(botCheck.getByTestId('notice-booking-site')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect(botCheck.getByTestId('notice-call')).toHaveAttribute('href', `tel:${TEST_SHOP.phone}`);
        await expect(page.getByTestId('confirm-booking')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'shows an error with a retry and the Square booking site when the open times fail to load',
      async ({ page }: { page: Page; }): Promise<void> => {
        let availabilityLoads: number = 0;
        await page.route(isAvailabilityRequest, async (route: Route): Promise<void> => {
          availabilityLoads++;
          if (availabilityLoads === 1) {
            await problem(
              route,
              503,
              'square_unavailable',
            );
            return;
          }
          await fulfillAvailability(route);
        });

        await page.goto('/book');

        const notice: Locator = page.getByTestId('booking-notice');
        await expect(notice).toHaveClass(/p-message-error/);
        await expect(notice.getByTestId('notice-booking-site')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect(openDays(page)).toHaveCount(0);
        await expectNoA11yViolations(page);
        await notice.getByTestId('notice-retry').click();

        await expect(notice).toHaveCount(0);
        await expect(openDays(page).first()).toBeVisible();
      },
    );

    test(
      'asks before leaving a picked day that is not booked: Keep booking stays, Leave goes (#210)',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await openDays(page).first().click();
        const homeLink: Locator = page.locator('header a.home-link');
        const leaveDialog: Locator = page.locator('.p-confirmdialog');

        await homeLink.click();
        await expect(leaveDialog).toBeVisible();
        await expectNoA11yViolations(page);
        await leaveDialog.locator('.p-confirmdialog-reject-button').click();
        await expect(leaveDialog).toHaveCount(0);
        await expect(page).toHaveURL(/\/book$/);

        await homeLink.click();
        await leaveDialog.locator('.p-confirmdialog-accept-button').click();
        await expect(page).toHaveURL(/\/$/);
      },
    );

    test(
      'leaves without asking while nothing is picked (#210)',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await openDays(page).first().waitFor();

        await page.locator('header a.home-link').click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.locator('.p-confirmdialog')).toHaveCount(0);
      },
    );
  },
);
