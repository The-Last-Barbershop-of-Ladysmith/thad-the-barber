import { TEST_ANNOUNCEMENT } from '../../../../testing/test-announcement';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { Announcement } from '../models/announcement.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { announcementsFeature, announcementsFeatureKey, toNewestFirst } from './announcements.feature';
import { AnnouncementsState, initialAnnouncementsState } from './announcements.state';

describe(
  'selectIsHidden',
  (): void => {
    function isHidden(announcements: AnnouncementsState): boolean {
      return announcementsFeature.selectIsHidden({
        [announcementsFeatureKey]: announcements,
      });
    }

    it(
      'shows the section before and while the announcements load, so the prerendered page keeps its link',
      (): void => {
        expect(isHidden(initialAnnouncementsState)).toBe(false);
        expect(isHidden({ ...initialAnnouncementsState, loadStatus: RequestStatus.Pending })).toBe(false);
      },
    );

    it(
      'hides the section once the API returns none (BR-32)',
      (): void => {
        expect(isHidden({
          announcements: [],
          loadStatus: RequestStatus.Success,
          shownIndex: 0,
        })).toBe(true);
      },
    );

    it(
      'hides the section when the file fails to load',
      (): void => {
        expect(isHidden({ ...initialAnnouncementsState, loadStatus: RequestStatus.Error })).toBe(true);
      },
    );

    it(
      'shows the section with an active announcement',
      (): void => {
        expect(isHidden({
          announcements: [TEST_ANNOUNCEMENT],
          loadStatus: RequestStatus.Success,
          shownIndex: 0,
        })).toBe(false);
      },
    );
  },
);

describe(
  'toNewestFirst',
  (): void => {
    function startingOn(title: string, startDate: string): Announcement {
      return {
        ...TEST_ANNOUNCEMENT,
        title,
        startDate,
      };
    }

    function titlesOf(announcements: Announcement[]): string[] {
      return announcements.map((announcement: Announcement): string => announcement.title);
    }

    it(
      'is empty with no announcements',
      (): void => {
        expect(toNewestFirst([])).toEqual([]);
      },
    );

    it(
      'orders by start date, latest first, wherever each sits in the list',
      (): void => {
        expect(titlesOf(toNewestFirst([
          startingOn('Oldest', '2026-10-01'),
          startingOn('Newest', '2026-10-20'),
          startingOn('Middle', '2026-10-10'),
        ]))).toEqual([
          'Newest',
          'Middle',
          'Oldest',
        ]);
      },
    );

    it(
      'puts the later one in the file first when two start the same day, without changing the list it was given',
      (): void => {
        const listed: Announcement[] = [
          startingOn('First listed', '2026-10-20'),
          startingOn('Second listed', '2026-10-20'),
          startingOn('Older', '2026-10-01'),
        ];

        expect(titlesOf(toNewestFirst(listed))).toEqual([
          'Second listed',
          'First listed',
          'Older',
        ]);
        expect(titlesOf(listed)).toEqual([
          'First listed',
          'Second listed',
          'Older',
        ]);
      },
    );

    it(
      'is exposed on the feature',
      (): void => {
        const selected: Announcement[] = announcementsFeature.selectNewestFirst({
          [announcementsFeatureKey]: {
            announcements: [
              startingOn('Older', '2026-09-01'),
              startingOn('Newer', '2026-10-01'),
            ],
            loadStatus: RequestStatus.Success,
            shownIndex: 0,
          },
        });

        expect(titlesOf(selected)).toEqual(['Newer', 'Older']);
      },
    );
  },
);

describe(
  'selectHomeSections',
  (): void => {
    const allFragments: string[] = HOME_SECTIONS.map((section: NavItem): string => section.fragment);

    function fragmentsFor(announcements: AnnouncementsState): string[] {
      return announcementsFeature.selectHomeSections({
        [announcementsFeatureKey]: announcements,
      })
        .map((section: NavItem): string => section.fragment);
    }

    it(
      'links every section, the gallery and reviews included, before the announcements load',
      (): void => {
        expect(fragmentsFor(initialAnnouncementsState)).toEqual(allFragments);
      },
    );

    it.each([
      [RequestStatus.Success],
      [RequestStatus.Error],
    ])(
      'leaves out only the announcements once they settle with none showing (%s, BR-32)',
      (loadStatus: RequestStatus): void => {
        expect(fragmentsFor({ ...initialAnnouncementsState, loadStatus }))
          .toEqual(allFragments.filter((fragment: string): boolean => fragment !== 'announcements'));
      },
    );

    it(
      'links every section with an active announcement',
      (): void => {
        const active: AnnouncementsState = {
          announcements: [TEST_ANNOUNCEMENT],
          loadStatus: RequestStatus.Success,
          shownIndex: 0,
        };

        expect(fragmentsFor(active)).toEqual(allFragments);
      },
    );
  },
);
