import {
  Locator,
  Page,
  Request,
  Route,
} from '@playwright/test';
import { expectNoA11yViolations } from '../support/axe';
import { expect, test } from '../support/fixtures';
import { SESSION_URL, isSessionRequest } from '../support/session';

test.describe(
  'booking',
  (): void => {
    test(
      'books the first open slot',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/book');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoA11yViolations(page);

        await page.locator('.p-datepicker-day:not(.p-disabled)').first().click();
        // PrimeNG marks a taken slot with data-p-disabled but not aria-disabled (#84), so a role filter matches it.
        await page.getByRole('group').locator('[role="button"][data-p-disabled="false"]').first().click();
        await page.locator('#booking-name').fill('Jordan Customer');
        const phone: Locator = page.locator('#booking-phone');
        // InputMask redraws its buffer on a timer after focus, which can wipe a value filled too soon.
        await expect(async (): Promise<void> => {
          await phone.fill('5405550123');
          await expect(phone).toHaveValue('(540) 555-0123', { timeout: 1_000 });
        }).toPass();
        await page.getByTestId('confirm-booking').click();

        await expect(page.getByTestId('booking-confirmation')).toContainText('(540) 555-0123');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'asks for one session with a reCAPTCHA token as the page opens, and stores no token',
      async ({ page }: { page: Page; }): Promise<void> => {
        const bodies: unknown[] = [];
        page.on('request', (request: Request): void => {
          if (request.url() === SESSION_URL) {
            bodies.push(request.postDataJSON());
          }
        });
        await page.goto('/book');

        await expect.poll((): unknown[] => bodies).toEqual([{ recaptchaToken: 'e2e-recaptcha-token' }]);
        expect(await page.evaluate((): string => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)))
          .not.toContain('e2e-session-jwt');
      },
    );

    test(
      'offers call and text instead when the bot check fails',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isSessionRequest, (route: Route): Promise<void> => route.fulfill({
          status: 403,
          contentType: 'application/problem+json',
          json: {
            type: 'about:blank',
            title: 'Made-up refusal',
            status: 403,
            code: 'bot_check_failed',
          },
        }));
        await page.goto('/book');

        await expect(page.getByTestId('bot-check-failed')).toHaveRole('alert');
        await expect(page.getByTestId('bot-check-call')).toHaveAttribute('href', /^tel:\+\d+$/);
        await expect(page.getByTestId('bot-check-text')).toHaveAttribute('href', /^sms:\+\d+$/);
        await expect(page.getByTestId('confirm-booking')).toBeDisabled();
        await expectNoA11yViolations(page);
      },
    );
  },
);
