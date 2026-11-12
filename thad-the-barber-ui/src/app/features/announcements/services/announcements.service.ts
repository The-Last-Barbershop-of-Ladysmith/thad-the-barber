import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { anonymousRequest } from '../../../core/interceptors/anonymous-request.token';
import { Button } from '../../../shared/models/button.models';
import { LinkKind } from '../../../shared/models/link.models';
import { linkKind } from '../../../shared/utils/link.utils';
import { AnnouncementButtonDto } from '../dtos/announcement-button.dto';
import { AnnouncementDto } from '../dtos/announcement.dto';
import { Announcement } from '../models/announcement.model';

export const ANNOUNCEMENTS_URL: string = `${environment.apiBaseUrl}/announcements`;

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http: HttpClient = inject(HttpClient);

  getAnnouncements(): Observable<Announcement[]> {
    return this.http
      .get<AnnouncementDto[]>(ANNOUNCEMENTS_URL, { context: anonymousRequest() })
      .pipe(map((announcements: AnnouncementDto[]): Announcement[] =>
        announcements.map((announcement: AnnouncementDto): Announcement => this.toAnnouncement(announcement))));
  }

  private toAnnouncement(announcement: AnnouncementDto): Announcement {
    return {
      ...announcement,
      buttons: announcement.buttons
        .map((button: AnnouncementButtonDto): Button | null => this.toButton(button))
        .filter((button: Button | null): button is Button => button !== null),
    };
  }

  private toButton(button: AnnouncementButtonDto): Button | null {
    const kind: LinkKind | null = linkKind(button.url);
    if (kind === null) {
      return null;
    }
    return { ...button, kind };
  }
}
