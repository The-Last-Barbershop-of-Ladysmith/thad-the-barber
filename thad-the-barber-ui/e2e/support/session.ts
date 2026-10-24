import { Route } from '@playwright/test';
import { SessionToken } from '../../src/app/core/models/session.models';
import { servedEnvironment } from './served-environment';

export const SESSION_URL: string = `${servedEnvironment.apiBaseUrl}/session`;

/** Stands in for Google's script, so tests never call Google and always pass the bot check in the browser. */
const RECAPTCHA_STUB: string = `window.grecaptcha = { enterprise: {
  ready: (callback) => callback(),
  execute: () => Promise.resolve('e2e-recaptcha-token'),
} };`;

export function isRecaptchaScript(url: URL): boolean {
  const isGoogle: boolean = url.origin === 'https://www.google.com';
  const isEnterpriseScript: boolean = url.pathname === '/recaptcha/enterprise.js';
  return isGoogle && isEnterpriseScript;
}

export async function fulfillRecaptcha(route: Route): Promise<void> {
  await route.fulfill({ contentType: 'text/javascript', body: RECAPTCHA_STUB });
}

export function isSessionRequest(url: URL): boolean {
  return url.href === SESSION_URL;
}

export async function fulfillSession(route: Route): Promise<void> {
  const session: SessionToken = { token: 'e2e-session-jwt', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
  await route.fulfill({ json: session });
}
