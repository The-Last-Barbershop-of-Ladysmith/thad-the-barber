import { TEST_ANNOUNCEMENT } from '../../../../testing/test-announcement';
import { Announcement } from '../models/announcement.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { shopFeatureKey } from '../../shop/state/shop.feature';
import { initialShopState } from '../../shop/state/shop.state';
import { announcementsFeature, announcementsFeatureKey, toActiveAnnouncements } from './announcements.feature';
import { AnnouncementsState, initialAnnouncementsState } from './announcements.state';

describe(
  'toActiveAnnouncements',
  (): void => {
    function announcement(
      title: string,
      startDate: string,
      endDate: string,
    ): Announcement {
      return {
        ...TEST_ANNOUNCEMENT,
        title,
        startDate,
        endDate,
      };
    }

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'keeps announcements from their first day through their last, by the local date until the shop loads',
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
        ], null).map((active: Announcement): string => active.title);

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
        ], null)).toEqual([]);
      },
    );

    it(
      'counts the day on the shop calendar once its timezone is known, wherever the visitor is (BR-30)',
      (): void => {
        // 2 a.m. on the 15th in Honolulu (UTC-10) is already 2 a.m. on the 16th in Kiritimati (UTC+14).
        vi.useFakeTimers({ now: new Date('2026-10-15T12:00:00Z') });
        const announcements: Announcement[] = [
          announcement(
            'Last day the 15th',
            '2026-10-01',
            '2026-10-15',
          ),
          announcement(
            'First day the 16th',
            '2026-10-16',
            '2026-10-31',
          ),
        ];

        const titlesIn: (timeZone: string) => string[] = (timeZone: string): string[] =>
          toActiveAnnouncements(announcements, timeZone).map((active: Announcement): string => active.title);

        expect(titlesIn('Pacific/Honolulu')).toEqual(['Last day the 15th']);
        expect(titlesIn('Pacific/Kiritimati')).toEqual(['First day the 16th']);
      },
    );
  },
);

describe(
  'selectIsHidden',
  (): void => {
    function isHidden(announcements: AnnouncementsState): boolean {
      return announcementsFeature.selectIsHidden({
        [announcementsFeatureKey]: announcements,
        [shopFeatureKey]: initialShopState,
      });
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
      'shows the section before and while the announcements load, so the prerendered page keeps its link',
      (): void => {
        expect(isHidden(initialAnnouncementsState)).toBe(false);
        expect(isHidden({ ...initialAnnouncementsState, loadStatus: RequestStatus.Pending })).toBe(false);
      },
    );

    it(
      'hides the section once none is active (BR-32)',
      (): void => {
        const expired: Announcement = { ...TEST_ANNOUNCEMENT, endDate: '2026-10-14' };

        expect(isHidden({ announcements: [expired], loadStatus: RequestStatus.Success })).toBe(true);
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
        expect(isHidden({ announcements: [TEST_ANNOUNCEMENT], loadStatus: RequestStatus.Success })).toBe(false);
      },
    );
  },
);
