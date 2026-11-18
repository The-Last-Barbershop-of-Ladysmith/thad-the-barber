/** Phones and anything narrower than the `md` breakpoint (48rem). */
const PHONE_SCREEN_QUERY: string = '(max-width: 47.9375rem)';

/** Whether the visitor is on a phone-sized screen. A test DOM has no `matchMedia`, and then nobody is. */
export function isPhoneScreen(view: Window | null): boolean {
  return view !== null && typeof view.matchMedia === 'function' && view.matchMedia(PHONE_SCREEN_QUERY).matches;
}
