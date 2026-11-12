import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { anonymousRequest } from '../../../core/interceptors/anonymous-request.token';
import { GalleryPhoto } from '../models/gallery-photo.model';

export const GALLERY_URL: string = `${environment.apiBaseUrl}/gallery`;

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http: HttpClient = inject(HttpClient);

  getPhotos(): Observable<GalleryPhoto[]> {
    return this.http.get<GalleryPhoto[]>(GALLERY_URL, { context: anonymousRequest() });
  }
}
