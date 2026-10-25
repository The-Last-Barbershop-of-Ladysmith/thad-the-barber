import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { announcementsFeatureKey } from '../../announcements/state/announcements.feature';
import { Announcement } from '../../announcements/models/announcement.model';
import { AnnouncementsState, initialAnnouncementsState } from '../../announcements/state/announcements.state';
import { shopFeatureKey } from '../../shop/state/shop.feature';
import { initialShopState } from '../../shop/state/shop.state';
import { homeFeature, homeFeatureKey } from './home.feature';
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
    const withAnnouncement: AnnouncementsState = {
      announcements: [
        {
          title: 'Made-up current post',
          bodyHtml: '',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          image: null,
          buttons: [],
        },
      ],
      loadStatus: RequestStatus.Success,
    };

    function fragments(home: HomeState, announcements: AnnouncementsState): string[] {
      return homeFeature.selectHomeSections({
        [homeFeatureKey]: home,
        [announcementsFeatureKey]: announcements,
        [shopFeatureKey]: initialShopState,
      })
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
        expect(fragments(initialHomeState, initialAnnouncementsState)).toEqual(ALL_SECTIONS);
      },
    );

    it(
      'links every section while the content loads',
      (): void => {
        const loading: HomeState = { ...initialHomeState, galleryStatus: RequestStatus.Pending };

        expect(fragments(loading, { ...initialAnnouncementsState, loadStatus: RequestStatus.Pending }))
          .toEqual(ALL_SECTIONS);
      },
    );

    it(
      'leaves out the announcements and gallery once they load with nothing to show',
      (): void => {
        const loaded: HomeState = { ...initialHomeState, galleryStatus: RequestStatus.Success };
        const expired: AnnouncementsState = {
          ...withAnnouncement,
          announcements: withAnnouncement.announcements.map((announcement: Announcement): Announcement => ({
            ...announcement,
            endDate: '2026-10-14',
          })),
        };

        expect(fragments(loaded, expired)).toEqual(WITHOUT_STORAGE_CONTENT);
      },
    );

    it(
      'leaves out the announcements and gallery when they fail to load',
      (): void => {
        const failed: HomeState = { ...initialHomeState, galleryStatus: RequestStatus.Error };

        expect(fragments(failed, { ...initialAnnouncementsState, loadStatus: RequestStatus.Error }))
          .toEqual(WITHOUT_STORAGE_CONTENT);
      },
    );

    it(
      'links the announcements and gallery once they have content',
      (): void => {
        const home: HomeState = {
          ...initialHomeState,
          gallery: [{ src: 'https://media.test/gallery/taper.webp', alt: 'Taper' }],
          galleryStatus: RequestStatus.Success,
        };

        expect(fragments(home, withAnnouncement)).toEqual(ALL_SECTIONS);
      },
    );
  },
);
