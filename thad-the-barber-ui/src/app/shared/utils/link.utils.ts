import { LinkKind } from '../models/link.models';

/**
 * `/book#hours` → internal, `https://…` → external, `tel:` and `mailto:` → device, anything else → null.
 * Browsers read `//host` and `/\host` as another site, so those aren't internal.
 */
export function linkKind(url: string): LinkKind | null {
  if (/^\/(?![/\\])/.test(url)) {
    return LinkKind.Internal;
  }
  if (/^https:\/\//i.test(url)) {
    return LinkKind.External;
  }
  if (/^(tel|mailto):/i.test(url)) {
    return LinkKind.Device;
  }
  return null;
}
