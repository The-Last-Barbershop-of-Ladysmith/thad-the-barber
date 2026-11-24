import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AnnouncementTextPreviewRequestDto } from '../dtos/announcement-text-preview-request.dto';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextRequestDto } from '../dtos/announcement-text-request.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';

export const ADMIN_ANNOUNCEMENT_TEXTS_URL: string = `${environment.apiBaseUrl}/admin/announcement-texts`;

/** Both calls go with the admin token (the session interceptor picks it for `/api/admin/*`). */
@Injectable({ providedIn: 'root' })
export class AdminAnnouncementTextsService {
  private readonly http: HttpClient = inject(HttpClient);

  preview(request: AnnouncementTextPreviewRequestDto): Observable<AnnouncementTextPreviewDto> {
    return this.http.post<AnnouncementTextPreviewDto>(`${ADMIN_ANNOUNCEMENT_TEXTS_URL}/preview`, request);
  }

  /** Answers 202 once the text is saved to go out; the texts themselves are sent in the background. */
  send(request: AnnouncementTextRequestDto): Observable<AnnouncementTextStatusDto> {
    return this.http.post<AnnouncementTextStatusDto>(ADMIN_ANNOUNCEMENT_TEXTS_URL, request);
  }
}
