import { Announcement } from '../models/home.models';
import { activeAnnouncements } from './home.feature';

describe(
  'activeAnnouncements',
  (): void => {
    function announcement(title: string, startDate: string, endDate: string): Announcement {
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
        vi.useFakeTimers({ now: new Date(2026, 9, 15, 23, 59) });

        const titles: string[] = activeAnnouncements([
          announcement('Ended yesterday', '2026-10-01', '2026-10-14'),
          announcement('Ends today', '2026-10-01', '2026-10-15'),
          announcement('Only today', '2026-10-15', '2026-10-15'),
          announcement('Starts today', '2026-10-15', '2026-12-31'),
          announcement('Starts tomorrow', '2026-10-16', '2026-10-31'),
          announcement('Spans the year', '2025-12-31', '2027-01-01'),
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
        vi.useFakeTimers({ now: new Date(2026, 9, 16, 0, 0) });

        expect(activeAnnouncements([announcement('Ended yesterday', '2026-10-01', '2026-10-15')])).toEqual([]);
      },
    );
  },
);
