import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';

export const BOOKINGS_URL: string = `${environment.apiBaseUrl}/bookings`;

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http: HttpClient = inject(HttpClient);

  createBooking(request: BookingRequest): Observable<BookingConfirmation> {
    return this.http.post<BookingConfirmation>(BOOKINGS_URL, request);
  }
}
