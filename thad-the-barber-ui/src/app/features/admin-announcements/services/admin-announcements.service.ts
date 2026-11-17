import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto, AnnouncementsSaveRequestDto } from '../dtos/announcements-save-request.dto';

export const ADMIN_ANNOUNCEMENTS_URL: string = `${environment.apiBaseUrl}/admin/announcements`;

/** Both calls go with the admin token (the session interceptor picks it for `/api/admin/*`). */
@Injectable({ providedIn: 'root' })
export class AdminAnnouncementsService {
  private readonly http: HttpClient = inject(HttpClient);

  getAll(): Observable<AdminAnnouncementDto[]> {
    return this.http.get<AdminAnnouncementDto[]>(ADMIN_ANNOUNCEMENTS_URL);
  }

  /** Replaces the whole list; the response is the list as saved. */
  save(items: AnnouncementInputDto[]): Observable<AdminAnnouncementDto[]> {
    const body: AnnouncementsSaveRequestDto = { items };
    return this.http.put<AdminAnnouncementDto[]>(ADMIN_ANNOUNCEMENTS_URL, body);
  }
}
