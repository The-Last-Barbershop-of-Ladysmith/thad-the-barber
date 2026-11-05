import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { anonymousRequest } from '../../../core/interceptors/anonymous-request.token';
import { NEXT_TIMES_COUNT } from '../config/next-times';

export const NEXT_TIMES_URL: string = `${environment.apiBaseUrl}/bookings/next`;

@Injectable({ providedIn: 'root' })
export class NextTimesService {
  private readonly http: HttpClient = inject(HttpClient);

  /** The next open times as UTC instants, earliest first. Anonymous on the API, so a home visit spends no bot check. */
  getNextTimes(): Observable<string[]> {
    return this.http.get<string[]>(
      NEXT_TIMES_URL,
      {
        params: { count: NEXT_TIMES_COUNT },
        context: anonymousRequest(),
      },
    );
  }
}
