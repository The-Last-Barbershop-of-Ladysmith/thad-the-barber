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

const WITHOUT_ANNOUNCEMENTS: string[] = ALL_SECTIONS.filter((fragment: string): boolean => fragment !== 'announcements');

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
      shownIndex: 0,
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

    it.each([
      [RequestStatus.Success],
      [RequestStatus.Error],
    ])(
      'leaves out the reviews once they settle with nothing to show (%s)',
      (contentStatus: RequestStatus): void => {
        expect(fragments({ ...initialHomeState, contentStatus }, initialAnnouncementsState)).not.toContain('reviews');
      },
    );

    it(
      'links the reviews once there are some',
      (): void => {
        const home: HomeState = {
          ...initialHomeState,
          contentStatus: RequestStatus.Success,
          testimonials: [
            {
              id: 'review-0',
              quote: 'Made-up text',
              author: 'Avery Testwell',
              source: 'Customer review',
              rating: 5,
            },
          ],
        };

        expect(fragments(home, initialAnnouncementsState)).toContain('reviews');
      },
    );

    it(
      'links every section while the content loads',
      (): void => {
        const loading: AnnouncementsState = { ...initialAnnouncementsState, loadStatus: RequestStatus.Pending };

        expect(fragments(initialHomeState, loading)).toEqual(ALL_SECTIONS);
      },
    );

    it(
      'leaves out the announcements once they load with nothing to show',
      (): void => {
        const expired: AnnouncementsState = {
          ...withAnnouncement,
          announcements: withAnnouncement.announcements.map((announcement: Announcement): Announcement => ({
            ...announcement,
            endDate: '2026-10-14',
          })),
        };

        expect(fragments(initialHomeState, expired)).toEqual(WITHOUT_ANNOUNCEMENTS);
      },
    );

    it(
      'leaves out the announcements when they fail to load',
      (): void => {
        const failed: AnnouncementsState = { ...initialAnnouncementsState, loadStatus: RequestStatus.Error };

        expect(fragments(initialHomeState, failed)).toEqual(WITHOUT_ANNOUNCEMENTS);
      },
    );

    it(
      'links every section once the announcements have content',
      (): void => {
        expect(fragments(initialHomeState, withAnnouncement)).toEqual(ALL_SECTIONS);
      },
    );
  },
);

describe(
  'selectAreHeroFactsLoading',
  (): void => {
    function isLoadingFor(nextTimesStatus: RequestStatus, contentStatus: RequestStatus): boolean {
      return homeFeature.selectAreHeroFactsLoading({
        [homeFeatureKey]: {
          ...initialHomeState,
          nextTimesStatus,
          contentStatus,
        },
      });
    }

    it.each([
      [RequestStatus.Idle, RequestStatus.Success],
      [RequestStatus.Pending, RequestStatus.Success],
      [RequestStatus.Success, RequestStatus.Idle],
      [RequestStatus.Success, RequestStatus.Pending],
      [RequestStatus.Idle, RequestStatus.Idle],
    ])(
      'is true while the open times (%s) or the reviews (%s) have not answered',
      (nextTimesStatus: RequestStatus, contentStatus: RequestStatus): void => {
        expect(isLoadingFor(nextTimesStatus, contentStatus)).toBe(true);
      },
    );

    it.each([
      [RequestStatus.Success, RequestStatus.Success],
      [RequestStatus.Error, RequestStatus.Success],
      [RequestStatus.Success, RequestStatus.Error],
      [RequestStatus.Error, RequestStatus.Error],
    ])(
      'is false once both have loaded or failed (%s, %s)',
      (nextTimesStatus: RequestStatus, contentStatus: RequestStatus): void => {
        expect(isLoadingFor(nextTimesStatus, contentStatus)).toBe(false);
      },
    );
  },
);
