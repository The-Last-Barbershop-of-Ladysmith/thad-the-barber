import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { toCurrentIndex, toShownRailSections } from './scroll-rail.utils';

function toFragments(sections: readonly NavItem[]): string[] {
  return sections.map((section: NavItem): string => section.fragment);
}

describe(
  'toCurrentIndex',
  (): void => {
    it(
      'picks the last section whose top has passed the line',
      (): void => {
        expect(toCurrentIndex(
          [
            -900,
            -300,
            200,
            700,
          ],
          1000,
          0.4,
        )).toBe(2);
      },
    );

    it(
      'picks the first section while none has reached the line',
      (): void => {
        expect(toCurrentIndex(
          [450, 900],
          1000,
          0.4,
        )).toBe(0);
      },
    );

    it(
      'counts a top exactly on the line as reached',
      (): void => {
        expect(toCurrentIndex(
          [-10, 400],
          1000,
          0.4,
        )).toBe(1);
      },
    );
  },
);

describe(
  'toShownRailSections',
  (): void => {
    it(
      'keeps every tooth when the header shows every section',
      (): void => {
        expect(toFragments(toShownRailSections(HOME_SECTIONS)))
          .toEqual([
            'top',
            'chair',
            'hours',
            'announcements',
            'gallery',
            'reviews',
            'visit',
          ]);
      },
    );

    it(
      'drops the teeth of sections the header hides, keeping the ones it never lists',
      (): void => {
        const shown: NavItem[] = HOME_SECTIONS.filter(
          (section: NavItem): boolean => section.fragment !== 'announcements' && section.fragment !== 'gallery',
        );

        expect(toFragments(toShownRailSections(shown))).toEqual([
          'top',
          'chair',
          'hours',
          'reviews',
          'visit',
        ]);
      },
    );
  },
);
