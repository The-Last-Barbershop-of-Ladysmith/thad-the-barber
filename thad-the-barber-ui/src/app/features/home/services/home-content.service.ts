import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HOME_CONTENT } from '../data/home-content.data';
import { HomeContent } from '../models/home.models';

/**
 * Testimonials.
 * Returns the bundled seed data for now; swap the body for an HttpClient call
 * (`${environment.apiBaseUrl}/reviews`) when the reviews API exists (#37).
 */
@Injectable({ providedIn: 'root' })
export class HomeContentService {
  getContent(): Observable<HomeContent> {
    return of(HOME_CONTENT);
  }
}
