import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AvailableDay } from '../models/available-day.model';

export const AVAILABILITY_URL: string = `${environment.apiBaseUrl}/bookings/availability`;

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http: HttpClient = inject(HttpClient);

  /** The open days in `month` ("2026-10", shop timezone), leaving out days with no open times. */
  getAvailableDays(month: string): Observable<AvailableDay[]> {
    return this.http.get<AvailableDay[]>(AVAILABILITY_URL, { params: { month } });
  }
}
