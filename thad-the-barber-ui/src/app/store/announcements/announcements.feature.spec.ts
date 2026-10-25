import { TEST_ANNOUNCEMENT } from '../../../testing/test-announcement';
import { Announcement } from '../../core/models/announcements/announcement.model';
import { RequestStatus } from '../../shared/models/request.models';
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

describe(
  'selectIsHidden',
  (): void => {
    function isHidden(announcements: AnnouncementsState): boolean {
      return announcementsFeature.selectIsHidden({ [announcementsFeatureKey]: announcements });
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
