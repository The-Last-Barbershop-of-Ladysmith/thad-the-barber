import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { shrinkPhoto } from '../../../../shared/utils/photo-shrink.utils';
import { AdminAnnouncementImageUploadDto } from '../dtos/admin-announcement-image-upload.dto';
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
  save(announcements: AnnouncementInputDto[]): Observable<AdminAnnouncementDto[]> {
    const body: AnnouncementsSaveRequestDto = { items: announcements };
    return this.http.put<AdminAnnouncementDto[]>(ADMIN_ANNOUNCEMENTS_URL, body);
  }

  /** Makes a photo for an announcement light, then sends it as a form; the response is where it was stored. */
  uploadImage(file: File): Observable<AdminAnnouncementImageUploadDto> {
    return from(shrinkPhoto(file)).pipe(
      switchMap((photo: File): Observable<AdminAnnouncementImageUploadDto> => {
        const form: FormData = new FormData();
        form.append('file', photo);
        return this.http.post<AdminAnnouncementImageUploadDto>(`${ADMIN_ANNOUNCEMENTS_URL}/images`, form);
      }),
    );
  }
}
