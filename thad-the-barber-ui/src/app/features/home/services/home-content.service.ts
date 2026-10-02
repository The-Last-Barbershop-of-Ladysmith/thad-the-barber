import { Injectable } from '@angular/core';
import { type Observable, of } from 'rxjs';
import { HOME_CONTENT } from '../data/home-content.data';
import { type HomeContent } from '../models/home.models';

/**
 * Announcements, testimonials and gallery photos.
 * Returns the bundled seed data for now; swap the body for an HttpClient call
 * (`${environment.apiBaseUrl}/content/home`) when the content API exists.
 */
@Injectable({ providedIn: 'root' })
export class HomeContentService {
  getContent(): Observable<HomeContent> {
    return of(HOME_CONTENT);
  }
}
