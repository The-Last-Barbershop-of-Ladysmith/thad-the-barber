import { Page } from '@playwright/test';

export interface FocusStop {
  description: string;
  outlineWidth: number;
  outlineStyle: string;
}

const TABBABLE_SELECTOR: string = 'a[href], button, input, select, textarea, [tabindex]';

export async function expectedTabStops(page: Page): Promise<string[]> {
  return page.evaluate((selector: string): string[] => {
    const isTabbable: (element: Element) => boolean = (element: Element): boolean => {
      const control: HTMLElement = element as HTMLElement;
      const isDisabled: boolean = (control as HTMLButtonElement).disabled;
      return !isDisabled
        && control.tabIndex >= 0
        && !control.closest('[inert], [aria-hidden="true"]')
        && control.checkVisibility({ visibilityProperty: true });
    };
    return Array.from(document.querySelectorAll(selector))
      .filter(isTabbable)
      .map((element: Element): string => [
        element.tagName.toLowerCase(),
        element.getAttribute('data-testid') ?? '',
        element.getAttribute('href') ?? element.getAttribute('aria-label') ?? '',
      ].join('|'));
  }, TABBABLE_SELECTOR);
}

export async function tabThrough(page: Page, count: number): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];
  for (let press: number = 0; press < count; press++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate((): FocusStop => {
      const element: Element | null = document.activeElement;
      if (!element) {
        return {
          description: 'none',
          outlineWidth: 0,
          outlineStyle: 'none',
        };
      }
      // A PrimeNG checkbox keeps its real input invisible and draws the ring on the box beside it.
      const ringElement: Element = element.classList.contains('p-checkbox-input')
        ? element.nextElementSibling ?? element
        : element;
      const style: CSSStyleDeclaration = getComputedStyle(ringElement);
      return {
        description: [
          element.tagName.toLowerCase(),
          element.getAttribute('data-testid') ?? '',
          element.getAttribute('href') ?? element.getAttribute('aria-label') ?? '',
        ].join('|'),
        outlineWidth: parseFloat(style.outlineWidth),
        outlineStyle: style.outlineStyle,
      };
    }));
  }
  return stops;
}
