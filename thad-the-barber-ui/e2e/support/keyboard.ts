import { Page } from '@playwright/test';

const MOST_TABS: number = 60;

/** Presses Tab until `selector` is focused; running past `MOST_TABS` means a trap or an unreachable control. */
export async function tabUntilFocused(page: Page, selector: string): Promise<void> {
  for (let presses: number = 0; presses <= MOST_TABS; presses++) {
    const isFocused: boolean = await page.evaluate(
      (target: string): boolean => document.activeElement?.matches(target) ?? false,
      selector,
    );
    if (isFocused) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${selector}`);
}
