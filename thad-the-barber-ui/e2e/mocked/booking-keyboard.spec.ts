import { Locator, Page, Request, Route } from '@playwright/test';
import { BookingConfirmation } from '../../src/app/features/booking/dtos/booking-confirmation.dto';
import { BookingRequest } from '../../src/app/features/booking/dtos/booking-request.dto';
import { expectNoA11yViolations } from '../support/axe';
import { isBookingActionRequest, isBookingRequest, toManagedBooking } from '../support/booking';
import { expect, test } from '../support/fixtures';
import { tabUntilFocused } from '../support/keyboard';

const OPEN_DAY: string = '.p-datepicker-day:not(.p-disabled)';
const OPEN_TIME: string = '[data-testid="time-list"] [role="button"]';

async function typeWhenFocused(
  page: Page,
  field: Locator,
  text: string,
): Promise<void> {
  await expect(field).toBeFocused();
  await page.keyboard.type(text);
}

test.describe(
  'booking by keyboard alone',
  (): void => {
    test(
      'picks a day and a time, books, then cancels from the manage page, with focus always visible and never trapped',
      async ({ page }: { page: Page; }): Promise<void> => {
        const bookings: Request[] = [];
        await page.route(isBookingRequest, async (route: Route): Promise<void> => {
          bookings.push(route.request());
          const { startAt }: BookingRequest = route.request().postDataJSON() as BookingRequest;
          const confirmation: BookingConfirmation = {
            id: 'made-up-booking',
            startAt,
            manageToken: 'made-up-manage-token',
          };
          await route.fulfill({ status: 201, json: confirmation });
        });
        await page.route(isBookingActionRequest('cancel'), (route: Route): Promise<void> =>
          route.fulfill({ json: toManagedBooking(route, { isCancelled: true, canChange: false }) }));
        await page.goto('/book');
        await expect(page.locator(`[data-testid="date-picker"] ${OPEN_DAY}`).first()).toBeVisible();

        await tabUntilFocused(page, OPEN_DAY);
        const firstDay: string | null = await page.locator(':focus').getAttribute('data-date');
        await page.keyboard.press('ArrowRight');
        const nextDay: string | null = await page.locator(':focus').getAttribute('data-date');
        expect(nextDay).not.toBe(firstDay);
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('time-list')).toBeVisible();

        await tabUntilFocused(page, OPEN_TIME);
        await page.keyboard.press('Enter');
        await expect(page.locator(`${OPEN_TIME}[aria-pressed="true"]`)).toHaveCount(1);

        await tabUntilFocused(page, '#booking-name');
        await typeWhenFocused(
          page,
          page.locator('#booking-name'),
          'Jordan Customer',
        );
        await page.keyboard.press('Tab');
        await expect(page.locator('#booking-phone')).toHaveValue('(___) ___-____');
        await typeWhenFocused(
          page,
          page.locator('#booking-phone'),
          '5405550123',
        );
        await expect(page.locator('#booking-phone')).toHaveValue('(540) 555-0123');
        await tabUntilFocused(page, '#booking-text-consent');
        await page.keyboard.press('Space');
        await expect(page.locator('#booking-text-consent')).toBeChecked();
        await tabUntilFocused(page, '[data-testid="confirm-booking"]');
        await expectNoA11yViolations(page);
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('booking-confirmation')).toBeVisible();
        expect(bookings).toHaveLength(1);
        await expectNoA11yViolations(page);

        await tabUntilFocused(page, '[data-testid="cancel-booking"]');
        await page.keyboard.press('Enter');
        const dialog: Locator = page.locator('.p-confirmdialog');
        await expect(dialog).toBeVisible();
        await tabUntilFocused(page, '.p-confirmdialog-accept-button');
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('booking-status')).toBeVisible();
        await expect(page.getByTestId('cancel-booking')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'leaves the day picker by Tab instead of trapping the keyboard in the calendar',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await expect(page.locator(`[data-testid="date-picker"] ${OPEN_DAY}`).first()).toBeVisible();
        await tabUntilFocused(page, OPEN_DAY);

        await tabUntilFocused(page, ':is(a, button, input):not([data-testid="date-picker"] *)');

        await expect(page.locator('[data-testid="date-picker"]:has(:focus)')).toHaveCount(0);
      },
    );
  },
);
