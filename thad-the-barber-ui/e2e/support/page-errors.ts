import { Page } from '@playwright/test';

/** Uncaught errors in the page from now on; a hidden section must fail quietly. */
export function collectPageErrors(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error: Error): void => {
    pageErrors.push(error);
  });
  return pageErrors;
}
