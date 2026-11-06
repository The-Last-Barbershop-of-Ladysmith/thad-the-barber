import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { SCROLL_RAIL_SECTIONS } from '../config/scroll-rail';

/** The last section whose top has reached `currentLine` (a fraction of the viewport height), or the first one. */
export function toCurrentIndex(
  tops: readonly number[],
  viewportHeight: number,
  currentLine: number,
): number {
  let current: number = 0;
  tops.forEach((top: number, index: number): void => {
    if (top <= viewportHeight * currentLine) {
      current = index;
    }
  });
  return current;
}

/** The rail's sections without those the header's links left out (BR-32 and the gallery). */
export function toShownRailSections(shownHomeSections: readonly NavItem[]): NavItem[] {
  const shownFragments: string[] = shownHomeSections.map((shown: NavItem): string => shown.fragment);
  const headerFragments: string[] = HOME_SECTIONS.map((section: NavItem): string => section.fragment);
  return SCROLL_RAIL_SECTIONS.filter((section: NavItem): boolean =>
    !headerFragments.includes(section.fragment) || shownFragments.includes(section.fragment));
}
