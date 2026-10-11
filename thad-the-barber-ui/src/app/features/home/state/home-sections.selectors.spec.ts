import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop.models';
import { AppState, initialLayoutState } from '../../../store/app.state';
import { Announcement } from '../models/home.models';
import { selectHomeSections } from './home-sections.selectors';
import { HomeState, initialHomeState } from './home.state';

const ALL_SECTIONS: string[] = HOME_SECTIONS.map((section: NavItem): string => section.fragment);

const WITHOUT_STORAGE_CONTENT: string[] = [
  'schedule',
  'visit',
  'testimonials',
];

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
        expect(fragments(undefined)).toEqual(ALL_SECTIONS);
      },
    );

    it(
      'links every section while the content loads, so the prerendered page keeps them all',
      (): void => {
        const loading: HomeState = {
          ...initialHomeState,
          announcementsStatus: 'pending',
          galleryStatus: 'pending',
        };

        expect(fragments(loading)).toEqual(ALL_SECTIONS);
      },
    );

    it(
      'leaves out the announcements and gallery once they load with nothing to show',
      (): void => {
        const expired: Announcement = { ...current, endDate: '2026-10-14' };
        const loaded: HomeState = {
          ...initialHomeState,
          announcements: [expired],
          announcementsStatus: 'success',
          galleryStatus: 'success',
        };

        expect(fragments(loaded)).toEqual(WITHOUT_STORAGE_CONTENT);
      },
    );

    it(
      'leaves out the announcements and gallery when they fail to load',
      (): void => {
        const failed: HomeState = {
          ...initialHomeState,
          announcementsStatus: 'error',
          galleryStatus: 'error',
        };

        expect(fragments(failed)).toEqual(WITHOUT_STORAGE_CONTENT);
      },
    );

    it(
      'links the announcements and gallery once they have content',
      (): void => {
        const home: HomeState = {
          ...initialHomeState,
          announcements: [current],
          announcementsStatus: 'success',
          gallery: [{ src: 'https://media.test/gallery/taper.webp', alt: 'Taper' }],
          galleryStatus: 'success',
        };

        expect(fragments(home)).toEqual(ALL_SECTIONS);
      },
    );
  },
);
