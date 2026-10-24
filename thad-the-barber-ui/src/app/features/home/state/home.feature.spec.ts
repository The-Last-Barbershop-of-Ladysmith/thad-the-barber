import { Announcement } from '../models/home.models';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop/nav-item.model';
import { RequestStatus } from '../../../shared/models/request.models';
import {
  homeFeature,
  homeFeatureKey,
  toActiveAnnouncements,
} from './home.feature';
import { HomeState, initialHomeState } from './home.state';

describe(
  'toActiveAnnouncements',
  (): void => {
    function announcement(
      title: string,
      startDate: string,
      endDate: string,
    ): Announcement {
      return {
        title,
        bodyHtml: '',
        startDate,
        endDate,
        image: null,
        buttons: [],
      };
    }

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'keeps announcements from their first day through their last, by the local date',
      (): void => {
        vi.useFakeTimers({
          now: new Date(
            2026,
            9,
            15,
            23,
            59,
          ),
        });

        const titles: string[] = toActiveAnnouncements([
          announcement(
            'Ended yesterday',
            '2026-10-01',
            '2026-10-14',
          ),
          announcement(
            'Ends today',
            '2026-10-01',
            '2026-10-15',
          ),
          announcement(
            'Only today',
            '2026-10-15',
            '2026-10-15',
          ),
          announcement(
            'Starts today',
            '2026-10-15',
            '2026-12-31',
          ),
          announcement(
            'Starts tomorrow',
            '2026-10-16',
            '2026-10-31',
          ),
          announcement(
            'Spans the year',
            '2025-12-31',
            '2027-01-01',
          ),
        ]).map((active: Announcement): string => active.title);

        expect(titles).toEqual([
          'Ends today',
          'Only today',
          'Starts today',
          'Spans the year',
        ]);
      },
    );

    it(
      'starts a new day at local midnight',
      (): void => {
        vi.useFakeTimers({
          now: new Date(
            2026,
            9,
            16,
            0,
            0,
          ),
        });

        expect(toActiveAnnouncements([
          announcement(
            'Ended yesterday',
            '2026-10-01',
            '2026-10-15',
          ),
        ])).toEqual([]);
      },
    );
  },
);

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

    function fragments(home: HomeState): string[] {
      return homeFeature.selectHomeSections({ [homeFeatureKey]: home })
        .map((section: NavItem): string => section.fragment);
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
      'links every section before the content loads, so the prerendered page keeps them all',
      (): void => {
        expect(fragments(initialHomeState)).toEqual(ALL_SECTIONS);
      },
    );

    it(
      'links every section while the content loads',
      (): void => {
        const loading: HomeState = {
          ...initialHomeState,
          announcementsStatus: RequestStatus.Pending,
          galleryStatus: RequestStatus.Pending,
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
          announcementsStatus: RequestStatus.Success,
          galleryStatus: RequestStatus.Success,
        };

        expect(fragments(loaded)).toEqual(WITHOUT_STORAGE_CONTENT);
      },
    );

    it(
      'leaves out the announcements and gallery when they fail to load',
      (): void => {
        const failed: HomeState = {
          ...initialHomeState,
          announcementsStatus: RequestStatus.Error,
          galleryStatus: RequestStatus.Error,
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
          announcementsStatus: RequestStatus.Success,
          gallery: [{ src: 'https://media.test/gallery/taper.webp', alt: 'Taper' }],
          galleryStatus: RequestStatus.Success,
        };

        expect(fragments(home)).toEqual(ALL_SECTIONS);
      },
    );
  },
);
