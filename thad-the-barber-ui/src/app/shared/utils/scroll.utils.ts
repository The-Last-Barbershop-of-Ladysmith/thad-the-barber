/** An element this close to the top of the screen counts as already there. */
const ALREADY_AT_TOP_PX: number = 24;

/**
 * Brings `element` back into view when the page is scrolled past it (under the fixed header, or above the screen), so
 * a message that appears while the visitor is lower down on the page is seen. An element that is in view, or further
 * down the page, is left alone. Smooth unless the visitor asked for less motion.
 */
export function scrollBackToElement(element: HTMLElement): void {
  const view: Window | null = element.ownerDocument.defaultView;
  if (view === null) {
    return;
  }
  const headerClearance: number = Number.parseFloat(
    view.getComputedStyle(element.ownerDocument.documentElement).scrollPaddingTop,
  ) || 0;
  if (element.getBoundingClientRect().top >= headerClearance) {
    return;
  }
  const isMotionReduced: boolean = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({
    block: 'start',
    behavior: isMotionReduced ? 'auto' : 'smooth',
  });
}

/**
 * Brings `element` to the top of the screen, under the fixed header, unless it is already there. For a step of a form
 * that has just opened: the step before it collapsing makes the page shorter, which leaves the page scrolled to the
 * bottom with the new step out of sight.
 */
export function scrollToElementStart(element: HTMLElement): void {
  const view: Window | null = element.ownerDocument.defaultView;
  if (view === null || typeof element.scrollIntoView !== 'function') {
    return;
  }
  const headerClearance: number = Number.parseFloat(
    view.getComputedStyle(element.ownerDocument.documentElement).scrollPaddingTop,
  ) || 0;
  if (Math.abs(element.getBoundingClientRect().top - headerClearance) < ALREADY_AT_TOP_PX) {
    return;
  }
  const isMotionReduced: boolean = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({
    block: 'start',
    behavior: isMotionReduced ? 'auto' : 'smooth',
  });
}
