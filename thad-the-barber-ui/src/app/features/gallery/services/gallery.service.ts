import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { anonymousRequest } from '../../../core/interceptors/anonymous-request.token';
import { GalleryPhotoDto } from '../dtos/gallery-photo.dto';
import { GalleryPhoto } from '../models/gallery-photo.model';

export const GALLERY_URL: string = `${environment.apiBaseUrl}/gallery`;

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http: HttpClient = inject(HttpClient);

  /**
   * The photos of the media container's `gallery/` folder, newest upload first (BR-34, #204). The API lists the folder
   * and caches the result; the images themselves load straight from storage. Anonymous on the API.
   */
  getPhotos(): Observable<GalleryPhoto[]> {
    return this.http
      .get<GalleryPhotoDto[]>(GALLERY_URL, { context: anonymousRequest() })
      .pipe(map((photos: GalleryPhotoDto[]): GalleryPhoto[] =>
        photos.map(({ src, alt }: GalleryPhotoDto): GalleryPhoto => ({ src, alt }))));
  }
}
