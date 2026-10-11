import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GalleryContent, GalleryPhoto } from '../models/home.models';

/** The gallery from `content/gallery.json` in the media container (issue #38), so it changes without a deploy. */
@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http: HttpClient = inject(HttpClient);

  getPhotos(): Observable<GalleryPhoto[]> {
    return this.http
      .get<GalleryContent>(`${environment.mediaBaseUrl}/content/gallery.json`)
      .pipe(map((content: GalleryContent): GalleryPhoto[] => content.photos));
  }
}
