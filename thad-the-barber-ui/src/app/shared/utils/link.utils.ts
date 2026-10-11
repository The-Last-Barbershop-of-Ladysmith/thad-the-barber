/** How a link from content opens: through the Router, in a new tab, or by the device's phone or mail app. */
export type LinkKind = 'internal' | 'external' | 'device';

/**
 * `/book#hours` → internal, `https://…` → external, `tel:` and `mailto:` → device, anything else → null.
 * Browsers read `//host` and `/\host` as another site, so those aren't internal.
 */
export function linkKind(url: string): LinkKind | null {
  if (/^\/(?![/\\])/.test(url)) {
    return 'internal';
  }
  if (/^https:\/\//i.test(url)) {
    return 'external';
  }
  if (/^(tel|mailto):/i.test(url)) {
    return 'device';
  }
  return null;
}
