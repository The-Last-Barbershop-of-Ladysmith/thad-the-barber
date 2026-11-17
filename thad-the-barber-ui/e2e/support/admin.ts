import { Page, Route } from '@playwright/test';
import { AdminSessionDto } from '../../src/app/features/admin/dtos/admin-session.dto';
import { servedEnvironment } from './served-environment';

export const ADMIN_CONFIG_URL: string = `${servedEnvironment.apiBaseUrl}/admin/config`;
export const ADMIN_SESSION_URL: string = `${servedEnvironment.apiBaseUrl}/admin/session`;

export const ADMIN_EMAIL: string = 'owner@example.com';

/**
 * Stands in for Google Identity Services, so tests never call Google: `renderButton` draws a button that, when
 * clicked, hands the page an ID token like the real one does after an account is picked.
 */
const GOOGLE_SIGN_IN_STUB: string = `window.google = { accounts: { id: {
  initialize: (config) => { window.__googleConfig = config; },
  renderButton: (container) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'google-stub-button';
    button.textContent = 'Sign in with Google';
    button.addEventListener('click', () => window.__googleConfig.callback({ credential: 'e2e-google-id-token' }));
    container.append(button);
  },
} } };`;

export function isGoogleScript(url: URL): boolean {
  return url.origin === 'https://accounts.google.com' && url.pathname === '/gsi/client';
}

export async function fulfillGoogleScript(route: Route): Promise<void> {
  await route.fulfill({ contentType: 'text/javascript', body: GOOGLE_SIGN_IN_STUB });
}

export function adminSession(): AdminSessionDto {
  return {
    token: 'e2e-admin-jwt',
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    email: ADMIN_EMAIL,
  };
}

/** The API's ProblemDetails for a failed admin call. */
export async function fulfillProblem(
  route: Route,
  status: number,
  code: string,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/problem+json',
    json: {
      type: 'about:blank',
      title: code,
      status,
      code,
    },
  });
}

/** Mocks `GET /api/admin/config`, then the Google script; sign-in itself is mocked by each test. */
export async function mockGoogleSignIn(page: Page): Promise<void> {
  await page.route(isGoogleScript, fulfillGoogleScript);
  await page.route(
    (url: URL): boolean => url.href === ADMIN_CONFIG_URL,
    async (route: Route): Promise<void> => {
      await route.fulfill({ json: { googleClientId: 'e2e-client-id.apps.example.com' } });
    },
  );
}
