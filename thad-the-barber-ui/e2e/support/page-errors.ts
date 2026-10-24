import { ConsoleMessage, Page } from '@playwright/test';

/** Uncaught errors in the page from now on; a hidden section must fail quietly. */
export function collectPageErrors(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error: Error): void => {
    pageErrors.push(error);
  });
  return pageErrors;
}

/** Angular's hydration and runtime errors from now on; they're logged with an NG0 code rather than thrown. */
export function collectAngularErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage): void => {
    const isAngularError: boolean = message.type() === 'error' && /NG0\d+/.test(message.text());
    if (isAngularError) {
      errors.push(message.text());
    }
  });
  return errors;
}
