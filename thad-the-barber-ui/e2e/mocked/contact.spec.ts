import { Locator, Page, Route } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { isAvailabilityRequest } from '../support/booking';
import { expectNoA11yViolations } from '../support/axe';
import { isContactRequest } from '../support/contact';
import { expect, test } from '../support/fixtures';

/** The page is prerendered, so typing before the app has taken it over would be wiped when it does. */
async function openContactPage(page: Page): Promise<void> {
  await page.goto('/contact');
  await page.waitForLoadState('networkidle');
}

test.describe(
  'contact',
  (): void => {
    test(
      'the footer link opens the page, with the shop phone and Square link above the form',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.goto('/');

        await page.getByTestId('footer-contact').click();

        await expect(page).toHaveURL('/contact');
        await expect(page.getByTestId('contact-call')).toHaveAttribute('href', `tel:${TEST_SHOP.phone}`);
        await expect(page.getByTestId('contact-text')).toHaveAttribute('href', `sms:${TEST_SHOP.phone}`);
        await expect(page.getByTestId('contact-booking-site'))
          .toHaveAttribute('href', TEST_SHOP.squareBookingSiteUrl ?? '');
      },
    );

    test(
      'renders without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openContactPage(page);
        await expect(page.getByTestId('contact-form')).toBeVisible();

        await expectNoA11yViolations(page);
      },
    );

    test(
      'sends anonymous feedback and replaces the form with a thank-you',
      async ({ page }: { page: Page; }): Promise<void> => {
        let sentBody: unknown;
        await page.route(isContactRequest, async (route: Route): Promise<void> => {
          sentBody = route.request().postDataJSON();
          await route.fulfill({ status: 201, json: { id: 'made-up-receipt' } });
        });
        await openContactPage(page);

        await page.getByTestId('contact-category').getByRole('button').nth(2).click();
        await page.getByTestId('contact-message').fill('Made-up feedback');
        await page.getByTestId('contact-send').click();

        await expect(page.getByTestId('contact-sent')).toBeVisible();
        await expect(page.getByTestId('contact-form')).toHaveCount(0);
        expect(sentBody).toEqual({
          category: 'feedback',
          message: 'Made-up feedback',
        });
        await expectNoA11yViolations(page);
      },
    );

    test(
      'keeps the form and offers the shop phone when sending fails',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isContactRequest, (route: Route): Promise<void> => route.fulfill({
          status: 429,
          contentType: 'application/problem+json',
          json: { code: 'rate_limited' },
        }));
        await openContactPage(page);
        await page.getByTestId('contact-category').getByRole('button').nth(2).click();
        await page.getByTestId('contact-message').fill('Made-up feedback');

        await page.getByTestId('contact-send').click();

        await expect(page.getByTestId('contact-notice')).toBeVisible();
        await expect(page.getByTestId('contact-message')).toHaveValue('Made-up feedback');
        await expectNoA11yViolations(page);
      },
    );

    test(
      'an email that is not one gets a linked error after leaving the field, with no a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openContactPage(page);
        const email: Locator = page.getByTestId('contact-email');

        await email.fill('not-an-email');
        await expect(email).not.toHaveAttribute('aria-invalid', 'true');
        await email.blur();

        await expect(email).toHaveAttribute('aria-invalid', 'true');
        const errorId: string | null = await email.getAttribute('aria-describedby');
        expect(errorId).not.toBeNull();
        await expect(page.locator(`#${errorId}`)).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'reporting a problem shows its extra field without a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        await openContactPage(page);

        await page.getByTestId('contact-category').getByRole('button').nth(1).click();

        await expect(page.getByTestId('contact-page-or-booking')).toBeVisible();
        await expectNoA11yViolations(page);
      },
    );

    test(
      'while a message is being sent the form has no a11y violations',
      async ({ page }: { page: Page; }): Promise<void> => {
        let releaseRequest: () => void = (): void => undefined;
        const requestHeld: Promise<void> = new Promise<void>((release: () => void): void => {
          releaseRequest = release;
        });
        await page.route(isContactRequest, async (route: Route): Promise<void> => {
          await requestHeld;
          await route.fulfill({ status: 201, json: { id: 'made-up-receipt' } });
        });
        await openContactPage(page);
        await page.getByTestId('contact-category').getByRole('button').nth(2).click();
        await page.getByTestId('contact-message').fill('Made-up feedback');

        await page.getByTestId('contact-send').click();
        await expect(page.getByTestId('contact-message')).toBeDisabled();
        await expectNoA11yViolations(page);

        releaseRequest();
        await expect(page.getByTestId('contact-sent')).toBeVisible();
      },
    );

    test(
      'a booking error links to a problem report about that page',
      async ({ page }: { page: Page; }): Promise<void> => {
        await page.route(isAvailabilityRequest, (route: Route): Promise<void> => route.fulfill({ status: 500 }));
        await page.goto('/book');

        await page.getByTestId('booking-notice').getByTestId('notice-report').click();

        await expect(page).toHaveURL('/contact');
        await expect(page.getByTestId('contact-page-or-booking')).toHaveValue('/book');
      },
    );
  },
);
