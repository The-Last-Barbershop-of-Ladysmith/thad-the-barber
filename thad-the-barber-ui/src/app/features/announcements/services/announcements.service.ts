import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';
import { ButtonVariant } from '../../../shared/models/button.models';
import { LinkKind } from '../../../shared/models/link.models';
import { isButtonVariant } from '../../../shared/utils/button.utils';
import { linkKind } from '../../../shared/utils/link.utils';
import { Announcement } from '../models/announcement.model';
import { AnnouncementButton } from '../models/announcement-button.model';
import { AnnouncementImage } from '../models/announcement-image.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';

type Entry = Record<string, unknown>;

/**
 * The announcements in the media container's `content/announcements.json` (issue #30), which Thad edits in the Azure
 * portal. Files uploaded there carry no `Cache-Control`, so the request revalidates every time instead of letting the
 * browser keep an old copy. A file that isn't `{ items: [...] }` fails the request; an item without a title or valid
 * dates is skipped.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http: HttpClient = inject(HttpClient);

  getAnnouncements(): Observable<Announcement[]> {
    return this.http
      .get<unknown>(`${environment.mediaBaseUrl}/content/announcements.json`, { cache: 'no-cache' })
      .pipe(map(toAnnouncements));
  }
}

function toAnnouncements(content: unknown): Announcement[] {
  const items: unknown = isEntry(content) ? content['items'] : undefined;
  if (!Array.isArray(items)) {
    throw new Error('announcements.json has no items list.');
  }
  return items
    .filter(isEntry)
    .map(toAnnouncement)
    .filter((announcement: Announcement | null): announcement is Announcement => announcement !== null);
}

function toAnnouncement(entry: Entry): Announcement | null {
  const title: string | null = text(entry['title']);
  const startDate: string | null = day(entry['startDate']);
  const endDate: string | null = day(entry['endDate']);
  if (title === null || startDate === null || endDate === null || endDate < startDate) {
    return null;
  }
  return {
    title,
    bodyHtml: text(entry['bodyHtml']) ?? '',
    startDate,
    endDate,
    image: toImage(entry['image']),
    buttons: toButtons(entry['buttons']),
  };
}

function toImage(value: unknown): AnnouncementImage | null {
  if (!isEntry(value)) {
    return null;
  }
  const fileName: string | null = text(value['fileName']);
  if (fileName === null) {
    return null;
  }
  return {
    src: `${environment.mediaBaseUrl}/announcements/${encodeURIComponent(fileName)}`,
    alt: text(value['altText']) ?? '',
    position: value['position'] === AnnouncementImagePosition.Left
      ? AnnouncementImagePosition.Left
      : AnnouncementImagePosition.Right,
  };
}

function toButtons(value: unknown): AnnouncementButton[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isEntry)
    .map(toButton)
    .filter((button: AnnouncementButton | null): button is AnnouncementButton => button !== null);
}

/** A button without a label or with a link `linkKind` rejects is dropped; an unknown variant falls back to outlined. */
function toButton(entry: Entry): AnnouncementButton | null {
  const label: string | null = text(entry['label']);
  const url: string | null = text(entry['url']);
  if (label === null || url === null) {
    return null;
  }
  const kind: LinkKind | null = linkKind(url);
  if (kind === null) {
    return null;
  }
  const variant: unknown = entry['variant'];
  return {
    label,
    url,
    kind,
    variant: isButtonVariant(variant) ? variant : ButtonVariant.Outlined,
  };
}

function isEntry(value: unknown): value is Entry {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** A real calendar day as `YYYY-MM-DD` (so `2026-02-30` is rejected), or null. */
function day(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return toIsoDate(fromIsoDate(value)) === value ? value : null;
}
