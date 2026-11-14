import { Locator, Page, Route } from '@playwright/test';
import { FoundBooking } from '../../src/app/features/booking/dtos/found-booking.dto';
import { LookupCodeRequest } from '../../src/app/features/booking/dtos/lookup-code-request.dto';
import { VerifiedList } from '../../src/app/features/booking/dtos/verified-list.dto';
import { VerifiedListRequest } from '../../src/app/features/booking/dtos/verified-list-request.dto';
import { ProblemCode } from '../../src/app/shared/models/problem-code.model';
import { expectNoA11yViolations } from '../support/axe';
import { isLookupCodeRequest, isVerifiedListRequest } from '../support/booking';
import { expect, test } from '../support/fixtures';

const PHONE_DIGITS: string = '5555550123';
const MADE_UP_CODE: string = '004217';

const DAY_MS: number = 86_400_000;

const foundBookings: FoundBooking[] = [
  {
    id: 'made-up-soonest',
    startAt: new Date(Date.now() + DAY_MS).toISOString(),
    manageToken: 'made-up-soonest-token',
  },
  {
    id: 'made-up-later',
    startAt: new Date(Date.now() + (3 * DAY_MS)).toISOString(),
    manageToken: 'made-up-later-token',
  },
];

async function problem(
  route: Route,
  status: number,
  code: ProblemCode,
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

function toVerifiedList(bookings: FoundBooking[]): VerifiedList {
  return {
    bookings,
    lookupToken: 'made-up-lookup-token',
    expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
  };
}

async function acceptCode(route: Route): Promise<void> {
  await route.fulfill({ status: 202 });
}

async function fillInPhone(page: Page): Promise<void> {
  const phone: Locator = page.locator('#lookup-phone');
  // InputMask redraws its buffer on a timer after focus, which can wipe a value filled too soon.
  await expect(async (): Promise<void> => {
    await phone.fill(PHONE_DIGITS);
    await expect(phone).toHaveValue('(555) 555-0123', { timeout: 1_000 });
  }).toPass();
}

async function askForCode(page: Page): Promise<void> {
  await page.goto('/book/manage');
  await fillInPhone(page);
  await page.getByTestId('send-code').click();
  await expect(page.getByTestId('lookup-code')).toBeVisible();
}

async function submitCode(page: Page, code: string = MADE_UP_CODE): Promise<void> {
  await page.getByTestId('lookup-code').fill(code);
  await page.getByTestId('verify-code').click();
}

test.describe(
  'find my bookings',
  (): void => {
    test(
      'texts a code to the phone, lists its upcoming bookings, and opens one on its manage page',
      async ({ page }: { page: Page; }): Promise<void> => {
        const codeRequests: LookupCodeRequest[] = [];
        const verified: VerifiedListRequest[] = [];
        await page.route(isLookupCodeRequest, (route: Route): Promise<void> => {
          codeRequests.push(route.request().postDataJSON() as LookupCodeRequest);
          return acceptCode(route);
        });
        await page.route(isVerifiedListRequest, (route: Route): Promise<void> => {
          verified.push(route.request().postDataJSON() as VerifiedListRequest);
          return route.fulfill({ json: toVerifiedList(foundBookings) });
        });
        await page.goto('/book/manage');
        await expect(page.getByTestId('send-code')).toBeDisabled();
        await expectNoA11yViolations(page);

        await fillInPhone(page);
        await page.getByTestId('send-code').click();
        await expect(page.getByTestId('lookup-code')).toBeVisible();
        await expect(page.getByTestId('verify-code')).toBeDisabled();
        await expectNoA11yViolations(page);

        await submitCode(page);

        const found: Locator = page.getByTestId('found-booking');
        await expect(found).toHaveCount(2);
        await expectNoA11yViolations(page);
        expect(codeRequests).toEqual([{ phone: '+15555550123' }]);
        expect(verified).toEqual([{ phone: '+15555550123', code: MADE_UP_CODE }]);

        await found.first().click();

        await expect(page).toHaveURL(/\/book\/manage\/made-up-soonest$/);
        await expect(page.getByTestId('managed-booking')).toBeVisible();
      },
    );

    test(
      'keeps the code field open to retry after a wrong code',
      async ({ page }: { page: Page; }): Promise<void> => {
        let attempts: number = 0;
        await page.route(isLookupCodeRequest, acceptCode);
        await page.route(isVerifiedListRequest, (route: Route): Promise<void> => {
          attempts++;
          if (attempts === 1) {
            return problem(
              route,
              400,
              ProblemCode.CodeInvalid,
            );
          }
          return route.fulfill({ json: toVerifiedList(foundBookings) });
        });
        await askForCode(page);

        await submitCode(page, '000000');

        await expect(page.getByTestId('lookup-notice')).toBeVisible();
        await expect(page.getByTestId('lookup-code')).toBeEnabled();
        await expect(page.getByTestId('lookup-code')).toBeFocused();
        await expectNoA11yViolations(page);

        await submitCode(page);

        await expect(page.getByTestId('found-booking')).toHaveCount(2);
        await expect(page.getByTestId('lookup-notice')).toHaveCount(0);
      },
    );

    test(
      'shows no upcoming bookings as a message, not an error, and no list',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isLookupCodeRequest, acceptCode);
        await page.route(isVerifiedListRequest, (route: Route): Promise<void> =>
          route.fulfill({ json: toVerifiedList([]) }));
        await askForCode(page);

        await submitCode(page);

        await expect(page.getByTestId('no-bookings')).toBeVisible();
        await expect(page.getByTestId('book-another')).toHaveAttribute('href', '/book');
        await expect(page.getByTestId('found-bookings')).toHaveCount(0);
        await expect(page.getByTestId('lookup-notice')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'shows a rate limit and stays on the phone step',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isLookupCodeRequest, (route: Route): Promise<void> =>
          problem(
            route,
            429,
            ProblemCode.RateLimited,
          ));
        await page.goto('/book/manage');
        await fillInPhone(page);

        await page.getByTestId('send-code').click();

        await expect(page.getByTestId('lookup-notice')).toBeVisible();
        await expect(page.getByTestId('send-code')).toBeEnabled();
        await expect(page.locator('#lookup-phone')).toBeFocused();
        await expect(page.getByTestId('lookup-code')).toHaveCount(0);
        await expectNoA11yViolations(page);
      },
    );

    test(
      'confirms a new code with a live-region notice, and keeps focus on the empty code field',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isLookupCodeRequest, acceptCode);
        await askForCode(page);
        await page.getByTestId('lookup-code').fill('12');

        await page.getByTestId('resend-code').click();

        await expect(page.getByTestId('lookup-notice').getByRole('alert')).toBeVisible();
        await expect(page.getByTestId('lookup-code')).toHaveValue('');
        await expect(page.getByTestId('lookup-code')).toBeFocused();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'goes back to the phone step to use another number',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isLookupCodeRequest, acceptCode);
        await askForCode(page);

        await page.getByTestId('change-phone').click();

        await expect(page.getByTestId('send-code')).toBeVisible();
        await expect(page.getByTestId('lookup-code')).toHaveCount(0);
      },
    );

    test(
      'keeps only the lookup token, for the tab, and shows the list again after a reload without a new code',
      async ({ page }: { page: Page; }): Promise<void> => {
        const codeRequests: LookupCodeRequest[] = [];
        const lookupTokens: (string | undefined)[] = [];
        await page.route(isLookupCodeRequest, (route: Route): Promise<void> => {
          codeRequests.push(route.request().postDataJSON() as LookupCodeRequest);
          return acceptCode(route);
        });
        await page.route(isVerifiedListRequest, (route: Route): Promise<void> => {
          if (route.request().method() === 'GET') {
            lookupTokens.push(route.request().headers()['x-lookup-token']);
            return route.fulfill({ json: foundBookings });
          }
          return route.fulfill({ json: toVerifiedList(foundBookings) });
        });
        await askForCode(page);
        await submitCode(page);
        await expect(page.getByTestId('found-booking')).toHaveCount(2);

        const stored: { local: string; session: string; } = await page.evaluate(
          (): { local: string; session: string; } => ({
            local: JSON.stringify(Object.entries(localStorage)),
            session: JSON.stringify(Object.entries(sessionStorage)),
          }),
        );
        expect(stored.local).not.toContain('booking');
        expect(stored.session).not.toContain('made-up-later-token');

        await page.reload();

        await expect(page.getByTestId('found-booking')).toHaveCount(2);
        expect(lookupTokens).toEqual(['made-up-lookup-token']);
        expect(codeRequests).toHaveLength(1);
      },
    );

    test(
      'asks for a new code when the kept token has expired',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isLookupCodeRequest, acceptCode);
        await page.route(isVerifiedListRequest, (route: Route): Promise<void> => {
          if (route.request().method() === 'GET') {
            return problem(
              route,
              403,
              ProblemCode.LookupExpired,
            );
          }
          return route.fulfill({ json: toVerifiedList(foundBookings) });
        });
        await askForCode(page);
        await submitCode(page);
        await expect(page.getByTestId('found-booking')).toHaveCount(2);

        await page.reload();

        await expect(page.getByTestId('lookup-notice')).toBeVisible();
        await expect(page.getByTestId('send-code')).toBeVisible();
        await expect(page.getByTestId('found-booking')).toHaveCount(0);
      },
    );
  },
);
