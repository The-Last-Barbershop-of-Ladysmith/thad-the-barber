import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { shrinkPhoto } from '../../../../shared/utils/photo-shrink.utils';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';

export const ADMIN_GALLERY_URL: string = `${environment.apiBaseUrl}/admin/gallery`;

/** Every call goes with the admin token (the session interceptor picks it for `/api/admin/*`). */
@Injectable({ providedIn: 'root' })
export class AdminGalleryService {
  private readonly http: HttpClient = inject(HttpClient);

  getAll(): Observable<AdminGalleryPhotoDto[]> {
    return this.http.get<AdminGalleryPhotoDto[]>(ADMIN_GALLERY_URL);
  }

  /**
   * Makes the photo light, then sends it with its description as a form; the response is the stored photo, named from
   * the description.
   */
  upload(file: File, altText: string): Observable<AdminGalleryPhotoDto> {
    return from(shrinkPhoto(file)).pipe(
      switchMap((photo: File): Observable<AdminGalleryPhotoDto> => {
        const form: FormData = new FormData();
        form.append('file', photo);
        form.append('altText', altText);
        return this.http.post<AdminGalleryPhotoDto>(ADMIN_GALLERY_URL, form);
      }),
    );
  }

  /** Removes a photo; the API answers 204 with no body. */
  delete(fileName: string): Observable<null> {
    return this.http.delete<null>(`${ADMIN_GALLERY_URL}/${encodeURIComponent(fileName)}`);
  }
}
