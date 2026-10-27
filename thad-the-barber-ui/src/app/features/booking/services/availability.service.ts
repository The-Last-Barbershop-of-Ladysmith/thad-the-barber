import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';

export const AVAILABILITY_URL: string = `${environment.apiBaseUrl}/bookings/availability`;

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http: HttpClient = inject(HttpClient);

  /** The open days from `firstDay` through `lastDay` (shop timezone), leaving out days with no open times. */
  getAvailableDays({ firstDay, lastDay }: DayRange): Observable<AvailableDay[]> {
    return this.http.get<AvailableDay[]>(AVAILABILITY_URL, { params: { from: firstDay, to: lastDay } });
  }
}
