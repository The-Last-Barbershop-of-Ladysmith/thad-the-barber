import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { anonymousRequest } from '../../../core/interceptors/anonymous-request.token';
import { ReviewsResponse } from '../dtos/reviews-response.dto';

export const REVIEWS_URL: string = `${environment.apiBaseUrl}/reviews`;

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http: HttpClient = inject(HttpClient);

  /**
   * The testimonials and the Google listing's rating. The API reads them from `content/reviews.json` in the media
   * container, which Thad edits in the Azure portal (#245); Google's reviews API replaces that file in #37.
   * Anonymous on the API, so loading them never asks reCAPTCHA for a session token.
   */
  getReviews(): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(REVIEWS_URL, { context: anonymousRequest() });
  }
}
