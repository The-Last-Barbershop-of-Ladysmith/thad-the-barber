import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AnnouncementFilter } from '../models/announcement-filter.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';
import {
  countByStatus,
  endNow,
  filterAnnouncements,
  formatAnnouncementDates,
  removeAt,
  toInputs,
} from './announcement-list.utils';

function announcement(
  title: string,
  status: AdminAnnouncementStatus,
  startDate: string = '2026-10-01',
  endDate: string = '2026-10-31',
): AdminAnnouncementDto {
  return {
    title,
    bodyHtml: '<p>Body</p>',
    startDate,
    endDate,
    image: null,
    buttons: [],
    status,
  };
}

const NOW: AdminAnnouncementDto = announcement('Now', AdminAnnouncementStatus.Showing);
const SOON: AdminAnnouncementDto = announcement(
  'Soon',
  AdminAnnouncementStatus.Scheduled,
  '2026-11-01',
  '2026-11-30',
);
const PAST: AdminAnnouncementDto = announcement(
  'Past',
  AdminAnnouncementStatus.Ended,
  '2026-09-01',
  '2026-09-30',
);
const ITEMS: AdminAnnouncementDto[] = [
  NOW,
  SOON,
  PAST,
];

describe('filterAnnouncements', (): void => {
  it('keeps every item, with its place in the saved list, for All', (): void => {
    const all: { index: number; }[] = filterAnnouncements(ITEMS, AnnouncementFilter.All);

    expect(all.map((entry: { index: number; }): number => entry.index)).toEqual([
      0,
      1,
      2,
    ]);
  });

  it('keeps only one status, still with its place in the saved list', (): void => {
    const [scheduled]: { index: number; }[] = filterAnnouncements(ITEMS, AnnouncementFilter.Scheduled);

    expect(scheduled?.index).toBe(1);
    expect(filterAnnouncements(ITEMS, AnnouncementFilter.Ended)).toHaveLength(1);
  });
});

describe('countByStatus', (): void => {
  it('counts the items with a status', (): void => {
    expect(countByStatus(ITEMS, AdminAnnouncementStatus.Showing)).toBe(1);
    expect(countByStatus([], AdminAnnouncementStatus.Showing)).toBe(0);
  });
});

describe('formatAnnouncementDates', (): void => {
  it('says the range, the start of a scheduled post, and the end of an ended one', (): void => {
    expect(formatAnnouncementDates(NOW)).toBe('Oct 1 to Oct 31');
    expect(formatAnnouncementDates(SOON)).toBe('Starts Nov 1');
    expect(formatAnnouncementDates(PAST)).toBe('Ended Sep 30');
  });
});

describe('toInputs', (): void => {
  it('drops the status and the picture URL', (): void => {
    const withImage: AdminAnnouncementDto = {
      ...announcement('Pic', AdminAnnouncementStatus.Showing),
      image: {
        fileName: 'a.webp',
        altText: 'A',
        position: AnnouncementImagePosition.Left,
        src: 'https://example.test/a.webp',
      },
    };

    const [input]: AnnouncementInputDto[] = toInputs([withImage]);

    expect(input?.image).toEqual({
      fileName: 'a.webp',
      altText: 'A',
      position: AnnouncementImagePosition.Left,
    });
    expect(input).not.toHaveProperty('status');
  });
});

describe('endNow', (): void => {
  it("ends a running announcement on the shop's yesterday and leaves the others alone", (): void => {
    const inputs: AnnouncementInputDto[] = endNow(
      ITEMS,
      0,
      '2026-10-15',
    );

    expect(inputs.map((input: AnnouncementInputDto): string => input.endDate)).toEqual([
      '2026-10-14',
      '2026-11-30',
      '2026-09-30',
    ]);
  });

  it('removes one that started today, since no earlier day is left to end on', (): void => {
    const inputs: AnnouncementInputDto[] = endNow(
      [
        announcement(
          'Today',
          AdminAnnouncementStatus.Showing,
          '2026-10-15',
          '2026-10-20',
        ),
      ],
      0,
      '2026-10-15',
    );

    expect(inputs).toEqual([]);
  });

  it('changes nothing for a place that is not in the list', (): void => {
    expect(endNow(
      ITEMS,
      9,
      '2026-10-15',
    )).toHaveLength(3);
  });
});

describe('removeAt', (): void => {
  it('leaves out the item at a place', (): void => {
    expect(removeAt([
      'a',
      'b',
      'c',
    ], 1)).toEqual(['a', 'c']);
  });
});
