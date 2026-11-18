import { linkKind } from './link.utils';

/** Whether `url` is a link the site accepts: a page on it, https, tel: or mailto:. */
export function isAllowedLink(url: string): boolean {
  return linkKind(url.trim()) !== null;
}
