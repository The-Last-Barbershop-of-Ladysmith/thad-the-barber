import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop.models';
import { AppState, initialLayoutState } from '../../../store/app.state';
import { Announcement } from '../models/home.models';
import { selectHomeSections } from './home-sections.selectors';
import { HomeState, initialHomeState } from './home.state';

describe(
  'selectHomeSections',
  (): void => {
    const current: Announcement = {
      title: 'Made-up current post',
      bodyHtml: '',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      image: null,
      buttons: [],
    };

    function fragments(home: HomeState | undefined): string[] {
      const state: AppState = { layout: initialLayoutState, home };
      return selectHomeSections(state).map((section: NavItem): string => section.fragment);
    }

    beforeEach((): void => {
      vi.useFakeTimers({
        now: new Date(
          2026,
          9,
          15,
          12,
          0,
        ),
      });
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'links every section until the home slice registers',
      (): void => {
        expect(fragments(undefined)).toEqual(HOME_SECTIONS.map((section: NavItem): string => section.fragment));
      },
    );

    it(
      'leaves out the announcements and gallery while they have nothing to show',
      (): void => {
        const expired: Announcement = { ...current, endDate: '2026-10-14' };

        expect(fragments({ ...initialHomeState, announcements: [expired] })).toEqual([
          'schedule',
          'visit',
          'testimonials',
        ]);
      },
    );

    it(
      'links the announcements and gallery once they have content',
      (): void => {
        const home: HomeState = {
          ...initialHomeState,
          announcements: [current],
          gallery: [{ src: 'https://media.test/gallery/taper.webp', alt: 'Taper' }],
        };

        expect(fragments(home)).toEqual(HOME_SECTIONS.map((section: NavItem): string => section.fragment));
      },
    );
  },
);
