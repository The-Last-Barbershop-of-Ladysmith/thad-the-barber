import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AnnouncementFilter } from '../models/announcement-filter.model';
import { addDays, formatMonthDay, fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';

/** An announcement with its place in the saved list, which is how the edit page finds it. */
export interface IndexedAnnouncement {
  index: number;
  item: AdminAnnouncementDto;
}

/** The status each tab shows; All shows every status. */
const FILTER_STATUS: Readonly<Record<AnnouncementFilter, AdminAnnouncementStatus | null>> = {
  [AnnouncementFilter.All]: null,
  [AnnouncementFilter.Showing]: AdminAnnouncementStatus.Showing,
  [AnnouncementFilter.Scheduled]: AdminAnnouncementStatus.Scheduled,
  [AnnouncementFilter.Ended]: AdminAnnouncementStatus.Ended,
};

export function filterAnnouncements(
  items: readonly AdminAnnouncementDto[],
  filter: AnnouncementFilter,
): IndexedAnnouncement[] {
  const status: AdminAnnouncementStatus | null = FILTER_STATUS[filter];
  return items
    .map((item: AdminAnnouncementDto, index: number): IndexedAnnouncement => ({ index, item }))
    .filter(({ item }: IndexedAnnouncement): boolean => status === null || item.status === status);
}

export function countByStatus(items: readonly AdminAnnouncementDto[], status: AdminAnnouncementStatus): number {
  return items.filter((item: AdminAnnouncementDto): boolean => item.status === status).length;
}

/** "Nov 20 to Dec 26", "Starts Dec 1" or "Ended Nov 3": a scheduled post says when it starts, an ended one when. */
export function formatAnnouncementDates(item: AdminAnnouncementDto): string {
  switch (item.status) {
    case AdminAnnouncementStatus.Scheduled:
      return `Starts ${formatMonthDay(fromIsoDate(item.startDate))}`;
    case AdminAnnouncementStatus.Ended:
      return `Ended ${formatMonthDay(fromIsoDate(item.endDate))}`;
    case AdminAnnouncementStatus.Showing:
      return `${formatMonthDay(fromIsoDate(item.startDate))} to ${formatMonthDay(fromIsoDate(item.endDate))}`;
  }
}

/** The list as the API wants it back: the file's own shape, without the status or the picture's URL. */
export function toInputs(items: readonly AdminAnnouncementDto[]): AnnouncementInputDto[] {
  return items.map((item: AdminAnnouncementDto): AnnouncementInputDto => ({
    title: item.title,
    bodyHtml: item.bodyHtml,
    startDate: item.startDate,
    endDate: item.endDate,
    image: item.image === null
      ? null
      : {
        fileName: item.image.fileName,
        altText: item.image.altText,
        position: item.image.position,
      },
    buttons: item.buttons,
  }));
}

/**
 * Ends the announcement at `index` before `today` (the shop's day), so it leaves the site on the next load. One that
 * started today has no earlier day to end on, so it is removed instead.
 */
export function endNow(
  items: readonly AdminAnnouncementDto[],
  index: number,
  today: string,
): AnnouncementInputDto[] {
  const yesterday: string = toIsoDate(addDays(fromIsoDate(today), -1));
  const inputs: AnnouncementInputDto[] = toInputs(items);
  const item: AnnouncementInputDto | undefined = inputs[index];
  if (item === undefined) {
    return inputs;
  }
  if (item.startDate > yesterday) {
    return removeAt(inputs, index);
  }
  return inputs.map((input: AnnouncementInputDto, place: number): AnnouncementInputDto =>
    place === index ? { ...input, endDate: yesterday } : input);
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_item: T, place: number): boolean => place !== index);
}
