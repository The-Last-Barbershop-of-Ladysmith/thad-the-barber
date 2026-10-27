import { Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/models/booking-confirmation.model';
import { BookingRequest } from '../../src/app/features/booking/models/booking-request.model';
import { SavedConfirmation } from '../../src/app/features/booking/models/saved-confirmation.model';
import { KEEP_CONFIRMATION_MS } from '../../src/app/features/booking/utils/saved-confirmation.utils';
import { ProblemCode } from '../../src/app/shared/models/problem-code.model';
import { decodeBase64, encodeBase64 } from '../../src/app/shared/utils/base64.utils';
import { testSavedConfirmation } from '../../src/testing/test-booking';
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

/** One open time five minutes from now, so a kept booking hasn't started when the test reloads (BR-22). */
async function offerTimeSoon(page: Page): Promise<void> {
  const soon: Date = new Date(Date.now() + 5 * 60_000);
  soon.setUTCSeconds(0, 0);
  const date: string = new Intl.DateTimeFormat('en-CA', { timeZone: TEST_SHOP.timeZone }).format(soon);
  await page.route(isAvailabilityRequest, (route: Route): Promise<void> =>
    route.fulfill({ json: [{ date, times: [soon.toISOString()] }] }));
}

function openDays(page: Page): Locator {
  return page.getByTestId('date-list').locator('[role="button"]');
}

/** The shop has loaded, so the page can show times and a kept booking. */
async function waitForShop(page: Page): Promise<void> {
  await expect(page.locator(`a[href="tel:${TEST_SHOP.phone}"]`).first()).toBeAttached();
}

/**
 * Picks the first open day and time and fills in the made-up customer; each pick opens the next step. Then opens the
 * review step from the phone's sticky bar or the desktop's Continue (both `open-review`).
 */
async function fillInBooking(page: Page): Promise<void> {
  await openDays(page).first().click();
  await page.getByTestId('time-list').locator('[role="button"]').first().click();
  await page.locator('#booking-name').fill('Jordan Customer');
  const phone: Locator = page.locator('#booking-phone');
  // InputMask redraws its buffer on a timer after focus, which can wipe a value filled too soon.
  await expect(async (): Promise<void> => {
    await phone.fill(CUSTOMER_PHONE);
    await expect(phone).toHaveValue('(540) 555-0123', { timeout: 1_000 });
  }).toPass();
  await page.getByTestId('open-review').click();
}

/** Fills in the booking and confirms it from the review step. */
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

        await expect(page.getByTestId('booking-confirmation')).toContainText('(540) 555-0123');
        await expectNoA11yViolations(page);
        const [booking]: Request[] = bookings;
        const body: BookingRequest = booking?.postDataJSON() as BookingRequest;
        expect(await booking?.headerValue('authorization')).toBe('Bearer e2e-session-jwt');
        expect(body.startAt).toMatch(/T20:00:00Z$/);
        expect(body.phone).toBe(`+1${CUSTOMER_PHONE}`);
      },
    );

    test(
      'keeps the booking, without name or phone, through a reload (BR-22)',
      async ({ page }: { page: Page; }): Promise<void> => {
        await offerTimeSoon(page);
        await page.route(isBookingRequest, (route: Route): Promise<void> =>
          route.fulfill({ status: 201, json: confirm(route.request()) }));
        await page.goto('/book');
        await book(page);
        await expect(page.getByTestId('booking-confirmation')).toBeVisible();

        await page.reload();

        await expect(page.getByTestId('saved-booking')).toBeVisible();
        const saved: string = decodeBase64(await page.evaluate((): string => localStorage.getItem('ttb-booking') ?? ''));
        expect(Object.keys(JSON.parse(saved) as object)).toEqual(['savedConfirmation']);
        expect(saved).not.toContain('Jordan');
        expect(saved).not.toContain(CUSTOMER_PHONE.slice(-4));
      },
    );

    test(
      'drops a booking kept for more than 24 hours',
      async ({ page }: { page: Page; }): Promise<void> => {
        // The appointment is still a day away, so only the 24 hours can drop it.
        const savedAt: string = new Date(Date.now() - KEEP_CONFIRMATION_MS - 60_000).toISOString();
        const tomorrow: string = new Date(Date.now() + KEEP_CONFIRMATION_MS).toISOString();
        const savedConfirmation: SavedConfirmation = testSavedConfirmation(savedAt, tomorrow);
        const encoded: string = encodeBase64(JSON.stringify({ savedConfirmation }));
        await page.addInitScript((value: string): void => {
          localStorage.setItem('ttb-booking', value);
        }, encoded);

        await page.goto('/book');
        await waitForShop(page);

        await expect(page.getByTestId('saved-booking')).toHaveCount(0);
        const saved: string = decodeBase64(await page.evaluate((): string => localStorage.getItem('ttb-booking') ?? ''));
        expect(JSON.parse(saved)).toEqual({ savedConfirmation: null });
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
      'warns that the time was taken and reloads the open times',
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
        await book(page);

        const notice: Locator = page.getByTestId('booking-notice');
        await expect(notice).toHaveClass(/p-message-warn/);
        await expect(notice.getByTestId('notice-booking-site')).toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
        await expect.poll((): number => availabilityLoads).toBe(2);
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
        // Without a session token no days load, so the review step and its confirm button are never reached.
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
  },
);
